from rest_framework import serializers
from api.models import Company, User, CarbonTransaction, PricingConfig
from django.contrib.auth.models import User as AuthUser
from django.contrib.auth.password_validation import validate_password


class CompanySerializers(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = "__all__"


class UserSerializers(serializers.ModelSerializer):
    id = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = "__all__"

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
    role = serializers.ChoiceField(choices=[
        'Admin', 'Government Official', 'Company Buyer', 'NGO Representative'
    ])
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(), required=False, allow_null=True
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
        fields = ["id", "username", "email", "role", "company", "active"]


class PricingConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingConfig
        fields = ["id", "price_per_credit", "updated_at"]


from .pinata import pin_json, PinataError
from bson import ObjectId
from blockchain.client import (
    transfer_credits, BlockchainServiceError
)

class CarbonTransactionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = CarbonTransaction
        fields = "__all__"
        read_only_fields = ["ipfs_cid", "initiated_by", "tx_hash", "wallet_address"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for key, value in data.items():
            if isinstance(value, ObjectId):
                data[key] = str(value)
        return data

    def validate(self, data):
        transaction_type = data.get("transaction_type")
        company = data.get("project")
        requested = data.get("credits")

        if transaction_type == "Transfer":
            if not data.get("counterparty_project"):
                raise serializers.ValidationError(
                    {"counterparty_project": "A destination project is required for a Transfer."}
                )
            from .models import get_available_credits
            available = get_available_credits(company)
            if requested > available:
                raise serializers.ValidationError(
                    f"Insufficient credits: company has {available}, requested {requested}."
                )

        if transaction_type == "Cancellation":
            from .models import get_available_credits
            available = get_available_credits(company)
            if requested > available:
                raise serializers.ValidationError(
                    f"Insufficient credits: company has {available}, requested {requested}."
                )

        return data

    def create(self, validated_data):
        transaction = CarbonTransaction.objects.create(**validated_data)

        transaction_id = str(getattr(transaction, "pk", ""))
        initiated_by_id = str(getattr(transaction, "initiated_by_id", ""))
        project_id = str(getattr(transaction, "project_id", ""))

        payload = {
            "transaction_id": transaction_id,
            "credits": str(transaction.credits),
            "transaction_type": transaction.transaction_type,
            "initiated_by": initiated_by_id,
            "project": project_id,
            "timestamp": transaction.created_at.isoformat(),
        }

        try:
            cid = pin_json(payload, name=f"tx-{transaction_id}")
            transaction.ipfs_cid = cid
            transaction.save(update_fields=["ipfs_cid"])
        except PinataError:
            pass

        try:
            if transaction.transaction_type == "Transfer":
                from_project = getattr(transaction, "project", None)
                to_project = getattr(transaction, "counterparty_project", None)
                from_project_id = getattr(from_project, "id", None)
                to_project_id = getattr(to_project, "id", None)

                if from_project_id is None or to_project_id is None:
                    raise serializers.ValidationError(
                        {"project": "Both projects must have an id for a Transfer."}
                    )

                result = transfer_credits(
                    from_project_id=from_project_id,
                    to_project_id=to_project_id,
                    amount=int(transaction.credits),
                )
                transaction.tx_hash = result.get("txHash")
                transaction.save(update_fields=["tx_hash"])

            elif transaction.transaction_type == "Cancellation":
                pass

        except BlockchainServiceError:
            pass

        return transaction