from decimal import Decimal

from django.contrib.auth.models import User as AuthUser
from django.contrib.auth.password_validation import validate_password
from django.db import transaction as db_transaction

from rest_framework import serializers

from api.models import Company, User, CarbonTransaction, PricingConfig
from api.models import get_available_credits

from .pinata import pin_json, PinataError
from blockchain.client import transfer_credits, BlockchainServiceError


class CompanySerializers(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = "__all__"


class UserSerializers(serializers.ModelSerializer):
    id = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
    "id",
    "username",
    "email",
    "role",
    "added_date",
    "active",
    "auth_user",
    "company",
    ]

    def validate(self, data):
        role = data.get("role", getattr(self.instance, "role", None))
        company = data.get("company", getattr(self.instance, "company", None))

        if role == "Company Buyer" and not company:
            raise serializers.ValidationError(
                {"company": "A company is required for the 'Company Buyer' role."}
            )

        return data


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(
        choices=[
            "Admin",
            "Government Official",
            "Company Buyer",
            "NGO Representative",
        ]
    )
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        required=False,
        allow_null=True,
    )

    def validate_username(self, value):
        if AuthUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, data):
        if data.get("role") == "Company Buyer" and not data.get("company"):
            raise serializers.ValidationError(
                {"company": "A company is required for the 'Company Buyer' role."}
            )
        return data

    def create(self, validated_data):
        auth_user = AuthUser.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        business_user = User.objects.create(
            auth_user=auth_user,
            username=validated_data["username"],
            email=validated_data["email"],
            password="",
            role=validated_data["role"],
            company=validated_data.get("company"),
            active=True,
        )

        return business_user


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "company",
            "active",
        ]


class PricingConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingConfig
        fields = [
            "id",
            "price_per_credit",
            "updated_at",
        ]


class CarbonTransactionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)

    class Meta:
        model = CarbonTransaction
        fields = "__all__"
        read_only_fields = [
            "id",
            "initiated_by",
            "ipfs_cid",
            "tx_hash",
            "created_at",
        ]

    def validate(self, data):
        transaction_type = data.get("transaction_type")
        company = data.get("project")
        requested = data.get("credits")

        if requested is None:
            raise serializers.ValidationError(
                {"credits": "Credits are required."}
            )

        if requested <= Decimal("0"):
            raise serializers.ValidationError(
                {"credits": "Credits must be greater than zero."}
            )

        if transaction_type == "Transfer":
            counterparty = data.get("counterparty_project")

            if not counterparty:
                raise serializers.ValidationError(
                    {
                        "counterparty_project":
                        "A destination project is required for a Transfer."
                    }
                )

            if company == counterparty:
                raise serializers.ValidationError(
                    {
                        "counterparty_project":
                        "A company cannot transfer credits to itself."
                    }
                )

            available = get_available_credits(company)

            if requested > available:
                raise serializers.ValidationError(
                    {
                        "credits":
                        f"Insufficient credits: company has "
                        f"{available}, requested {requested}."
                    }
                )

            request = self.context.get("request")

            if request and request.user.is_authenticated:
                business_user = getattr(request.user, "profile", None)

                if (
                    business_user
                    and business_user.role == "Company Buyer"
                    and business_user.company_id != company.id
                ):
                    raise serializers.ValidationError(
                        {
                            "project":
                            "You can only transfer credits from your own company."
                        }
                    )

        elif transaction_type == "Cancellation":
            available = get_available_credits(company)

            if requested > available:
                raise serializers.ValidationError(
                    {
                        "credits":
                        f"Insufficient credits: company has "
                        f"{available}, requested {requested}."
                    }
                )

        return data

    def create(self, validated_data):
        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            transaction = CarbonTransaction.objects.create(**validated_data)

            transaction_id = str(transaction.pk)
            initiated_by_id = str(transaction.initiated_by_id)
            project_id = str(transaction.project_id)

            payload = {
                "transaction_id": transaction_id,
                "credits": str(transaction.credits),
                "transaction_type": transaction.transaction_type,
                "initiated_by": initiated_by_id,
                "project": project_id,
                "timestamp": transaction.created_at.isoformat(),
            }

            # IPFS is optional; do not fail the transaction if Pinata is unavailable.
            try:
                cid = pin_json(payload, name=f"tx-{transaction_id}")
                transaction.ipfs_cid = cid
                transaction.save(update_fields=["ipfs_cid"])
            except PinataError:
                pass

            # Handle blockchain transfer.
            if transaction.transaction_type == "Transfer":
                from_project = transaction.project
                to_project = transaction.counterparty_project

                if from_project is None or to_project is None:
                    raise serializers.ValidationError(
                        {"project": "Both source and destination projects are required."}
                    )

                try:
                    result = transfer_credits(
                        from_project_id=from_project.id,
                        to_project_id=to_project.id,
                        amount=str(transaction.credits),
                    )
                except BlockchainServiceError as exc:
                    raise serializers.ValidationError(
                        {"blockchain": f"Transfer failed: {str(exc)}"}
                    )

                tx_hash = result.get("txHash")
                if not tx_hash:
                    raise serializers.ValidationError(
                        {"blockchain": "Blockchain transfer did not return a transaction hash."}
                    )

                transaction.tx_hash = tx_hash
                transaction.save(update_fields=["tx_hash"])

                # Create the receiver-side transaction so the destination
                # company's balance increases.
                CarbonTransaction.objects.create(
                    project=to_project,
                    counterparty_project=from_project,
                    credits=transaction.credits,
                    transaction_type="Recieve",
                    initiated_by=transaction.initiated_by,
                    ipfs_cid=transaction.ipfs_cid,
                    tx_hash=tx_hash,
                    wallet_address=to_project.wallet_address,
                )

            return transaction