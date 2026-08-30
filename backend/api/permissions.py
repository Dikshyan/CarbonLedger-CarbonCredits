from rest_framework import permissions
from .models import User


def get_business_user(request):
    if not request.user or not request.user.is_authenticated:
        return None
    return getattr(request.user, "profile", None)


class CanInitiateTransactionType(permissions.BasePermission):
    """
    Role-based permission map for carbon transaction types.
    NGO Representatives can now create Verification and Validation transactions.
    Company Buyers and NGO Representatives can both initiate Transfers (marketplace purchases).
    """

    ALLOWED_ROLES = {
        "Issuance":     ("Admin", "Government Official"),
        "Transfer":     ("Company Buyer", "NGO Representative", "Admin"),
        "Recieve":      ("Company Buyer", "NGO Representative", "Admin"),
        "Verification": ("Government Official", "NGO Representative", "Admin"),
        "Validation":   ("Government Official", "NGO Representative", "Admin"),
        "Cancellation": ("Admin",),
    }

    def has_permission(self, request, view):
        # Read-only methods are always allowed for authenticated users
        if request.method not in ("POST", "PUT", "PATCH"):
            return True

        business_user = get_business_user(request)
        if business_user is None:
            return False

        transaction_type = request.data.get("transaction_type")
        allowed = self.ALLOWED_ROLES.get(transaction_type)

        # If transaction_type not recognised, deny
        if allowed is None:
            return False

        return business_user.role in allowed


def get_requesting_user(request):
    return get_business_user(request)
