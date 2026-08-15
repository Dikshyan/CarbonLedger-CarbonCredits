from rest_framework import serializers
from api.models import Company, User, CarbonTransaction, get_available_credits
from .pinata import pin_json, PinataError
from .blockchain_client import mint_credits, BlockchainServiceError
from django.contrib.auth.models import User as AuthUser
from django.contrib.auth.password_validation import validate_password


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
            password="",  # not used for real auth anymore, kept blank
            role=validated_data["role"],
            company=validated_data.get("company"),
            active=True,
        )
        return business_user

class CompanySerializers(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = "__all__"

class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "company", "active"]

class UserSerializers(serializers.ModelSerializer):
    id=serializers.ReadOnlyField()
    class Meta:
        model=User
        fields="__all__"
        extra_kwargs = {"password": {"write_only": True}}

    def validate(self, data):
        role = data.get("role", getattr(self.instance, "role", None))
        company = data.get("company", getattr(self.instance, "company", None))
        if role == "Company Buyer" and not company:
            raise serializers.ValidationError(
                {"company": "A company is required for the 'Company Buyer' role."}
            )
        return data

class CarbonTransactionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = CarbonTransaction
        fields = "__all__"
        read_only_fields = ["ipfs_cid"]

    def create(self, validated_data):
        transaction = CarbonTransaction.objects.create(**validated_data)

        transaction_id = getattr(transaction, "id", None)
        initiated_by_id = getattr(transaction, "initiated_by_id", None)
        project_id = getattr(transaction, "project_id", None)

        payload = {
            "transaction_id": str(transaction_id),
            "credits": str(transaction.credits),
            "transaction_type": transaction.transaction_type,
            "initiated_by": str(initiated_by_id),
            "project": str(project_id),
            "timestamp": transaction.created_at.isoformat(),
        }

        try:
            cid = pin_json(payload, name=f"tx-{transaction_id}")
            transaction.ipfs_cid = cid
            transaction.save(update_fields=["ipfs_cid"])
        except PinataError:
            cid = None

        if transaction.transaction_type == "Issuance" and cid:
            try:
                result = mint_credits(
                    owner_id=str(project_id),
                    amount=str(transaction.credits),
                    cid=cid,
                )
                transaction.tx_hash = result.get("txHash")
                transaction.wallet_address = result.get("toAddress")
                transaction.save(update_fields=["tx_hash", "wallet_address"])
            except BlockchainServiceError:
                pass

        return transaction

    def validate(self, data):
        if data.get("transaction_type") == "Transfer":
            company = data.get("project")
            requested = data.get("credits")
            available = get_available_credits(company)
            if requested > available:
                raise serializers.ValidationError(
                    f"Insufficient credits: company has {available}, requested {requested}."
                )
        return data