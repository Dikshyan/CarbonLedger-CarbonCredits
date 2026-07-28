from rest_framework import serializers
from api.models import Company,User
class CompanySerializers(serializers.HyperlinkedModelSerializer):
    class Meta:
        model=Company
        fields="__all__"

class UserSerializers(serializers.HyperlinkedModelSerializer):
    id=serializers.ReadOnlyField()
    class Meta:
        model=User
        fields="__all__"


from .pinata import pin_json, PinataError
from .models import CarbonTransaction
from bson import ObjectId
from .models import CarbonTransaction, get_available_credits  # plus whatever else is already there

class CarbonTransactionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = CarbonTransaction
        fields = "__all__"
        read_only_fields = ["ipfs_cid"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for key, value in data.items():
            if isinstance(value, ObjectId):
                data[key] = str(value)
        return data

    def create(self, validated_data):
        transaction = CarbonTransaction.objects.create(**validated_data)

        payload = {
            "transaction_id": str(transaction.id),
            "credits": str(transaction.credits),
            "transaction_type": transaction.transaction_type,
            "initiated_by": str(transaction.initiated_by_id),
            "project": str(transaction.project_id),
            "timestamp": transaction.created_at.isoformat(),
        }
        try:
            cid = pin_json(payload, name=f"tx-{transaction.id}")
            transaction.ipfs_cid = cid
            transaction.save(update_fields=["ipfs_cid"])
        except PinataError:
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