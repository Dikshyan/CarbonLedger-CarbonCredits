from rest_framework import permissions
from .models import User


def get_role(request):
    user_id = request.data.get("initiated_by") if hasattr(request, "data") else None
    if not user_id:
        return None
    try:
        return User.objects.get(pk=user_id).role
    except User.DoesNotExist:
        return None


class CanInitiateTransactionType(permissions.BasePermission):

    ALLOWED_ROLES = {
        "Issuance": ("Admin", "Government Official"),
        "Transfer": ("Company Buyer", "Admin"),
        "Recieve": ("Company Buyer", "Admin"),
        "Verification": ("Government Official", "NGO Representative", "Admin"),
        "Validation": ("Government Official", "NGO Representative", "Admin"),
        "Cancellation": ("Admin",),
    }

    def has_permission(self, request, view):
        if request.method != "POST":
            return True
        role = get_role(request)
        transaction_type = request.data.get("transaction_type")
        allowed = self.ALLOWED_ROLES.get(transaction_type)
        if allowed is None:
            return False
        return role in allowed

def get_requesting_user(request):
        user_id = request.query_params.get("user_id")
        if not user_id:
            return None
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None