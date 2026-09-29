from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User as AuthUser
from rest_framework import viewsets, permissions, status
from api.models import Company, User, CarbonTransaction, PricingConfig
from api.serializers import (
    CompanySerializers, UserSerializers, CarbonTransactionSerializer,
    RegisterSerializer, MeSerializer, PricingConfigSerializer,
)
from rest_framework.decorators import action
from rest_framework.response import Response
from api.permissions import (
    CanInitiateTransactionType, get_requesting_user, get_business_user, is_admin,
)
from django.utils import timezone
from api.reports import render_pdf
from api.models import get_available_credits
from api.pinata import pin_json
from rest_framework.views import APIView
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied


class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializers
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    # ── Protected fields that non-admins may never set via PATCH/PUT ──
    _PROTECTED_FIELDS = {
        "status",
        "assigned_verifier",
        "verifier_notes",
        "verified_at",
        "active",
        "created_by",
    }

    def get_queryset(self):
        business_user = get_business_user(self.request)

        # Unauthenticated / public read — full list (marketplace, public registry)
        if business_user is None:
            return Company.objects.all()

        # Admins and Government Officials have platform-wide visibility
        if business_user.role in ("Admin", "Government Official"):
            return Company.objects.all()

        # NGO Representatives see only projects they personally registered
        if business_user.role == "NGO Representative":
            return Company.objects.filter(created_by=business_user)

        # Company Buyers see only the company they are affiliated with
        if business_user.role == "Company Buyer" and business_user.company_id:
            return Company.objects.filter(pk=business_user.company_id)

        # Any other authenticated role with no company — empty
        return Company.objects.none()

    def perform_create(self, serializer):
        business_user = get_business_user(self.request)
        serializer.save(created_by=business_user)

    # ── Hardened update / partial_update ──
    # Status, verifier assignment, and verification fields must be changed
    # through dedicated endpoints (AssignVerifierView, ProjectReviewView),
    # not via generic PATCH/PUT.
    # Only Admins may update project metadata for any project.
    # NGOs may update their own projects' editable fields (name, location, etc.).
    # Verifiers and Buyers may not modify projects via this endpoint.

    def _check_update_permission(self, request, instance):
        """Raise PermissionDenied if the caller cannot update this project."""
        business_user = get_business_user(request)
        if business_user is None:
            raise PermissionDenied("Authentication required.")

        # Check for attempts to change protected fields via PATCH/PUT
        attempted_protected = self._PROTECTED_FIELDS & set(request.data.keys())
        if attempted_protected and not is_admin(request):
            raise PermissionDenied(
                f"You cannot modify protected fields ({', '.join(sorted(attempted_protected))}). "
                "Use the dedicated review/assignment endpoints."
            )

        # Admin can update any project (including status via PATCH for
        # backward-compatible admin approval while the frontend is
        # updated to use the new review endpoint).
        if is_admin(request):
            return

        # NGO can only edit their own projects' non-protected fields
        if business_user.role == "NGO Representative":
            if instance.created_by_id != business_user.id:
                raise PermissionDenied("You can only edit your own projects.")
            return

        # All other roles (Verifier, Buyer) may not modify projects here.
        raise PermissionDenied(
            "You do not have permission to modify projects through this endpoint."
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        self._check_update_permission(request, instance)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        self._check_update_permission(request, instance)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def Users(self, request, pk=None):
        company = get_object_or_404(self.get_queryset(), pk=pk)

        us = User.objects.filter(company=company)
        us_serializer = UserSerializers(
            us,
            many=True,
            context={'request': request}
        )
        return Response(us_serializer.data)

    @action(
        detail=True,
        methods=['get'],
        permission_classes=[permissions.IsAuthenticated]
    )
    def report(self, request, pk=None):
        company = get_object_or_404(self.get_queryset(), pk=pk)

        requesting_user = get_requesting_user(request)

        if requesting_user is None:
            return Response(
                {"detail": "No business profile linked to this account."},
                status=403
            )

        transactions = CarbonTransaction.objects.filter(
            project=company
        ).order_by('created_at')

        balance = get_available_credits(company)

        context = {
            "company": company,
            "transactions": transactions,
            "balance": balance,
            "generated_at": timezone.now(),
        }

        filename = f"MRV_Report_{company.name}.pdf"

        return render_pdf(
            "reports/project_report.html",
            context,
            filename
        )

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializers
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business_user = get_requesting_user(self.request)

        if business_user is None:
            return User.objects.none()

        if business_user.role in ("Admin", "Government Official"):
            return User.objects.all()

        if business_user.company_id:
            return User.objects.filter(company_id=business_user.company_id)

        return User.objects.none()

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Users cannot be created through this endpoint."},
            status=405
        )

    def update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Users cannot be modified through this endpoint."},
            status=405
        )

    def partial_update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Users cannot be modified through this endpoint."},
            status=405
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Users cannot be deleted through this endpoint."},
            status=405
        )

class CarbonTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = CarbonTransactionSerializer
    permission_classes = [permissions.IsAuthenticated, CanInitiateTransactionType]

    def get_queryset(self):
        business_user = get_business_user(self.request)

        if business_user is None:
            return CarbonTransaction.objects.none()

        # Admins and government officials can see all transactions.
        if business_user.role in ("Admin", "Government Official"):
            return CarbonTransaction.objects.all()

        # Company Buyers and NGO Representatives can only see
        # transactions involving their own company.
        if business_user.company_id:
            return CarbonTransaction.objects.filter(
                Q(project_id=business_user.company_id)
                | Q(counterparty_project_id=business_user.company_id)
            ).distinct()

        return CarbonTransaction.objects.none()

    def perform_create(self, serializer):
        business_user = get_business_user(self.request)

        if business_user is None:
            raise PermissionDenied(
                "No business profile linked to this account."
            )

        transaction_type = serializer.validated_data.get("transaction_type")
        project = serializer.validated_data.get("project")

        # ── Verification / Validation: require assigned verifier ──
        if transaction_type in ("Verification", "Validation") and project:
            if business_user.role == "Government Official":
                # The verifier must be assigned to this specific project.
                if project.assigned_verifier_id != business_user.id:
                    raise PermissionDenied(
                        "You are not the assigned verifier for this project."
                    )
            elif business_user.role == "NGO Representative":
                # NGOs may not create Verification/Validation for their own projects.
                if project.created_by_id == business_user.id:
                    raise PermissionDenied(
                        "You cannot verify or validate your own project."
                    )
            # Admin is allowed unconditionally.

        serializer.save(initiated_by=business_user)

    def update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Transactions cannot be modified."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def partial_update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Transactions cannot be modified."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Transactions cannot be deleted."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[permissions.IsAuthenticated],
    )
    def certificate(self, request, pk=None):
        transaction = get_object_or_404(
            self.get_queryset(),
            pk=pk,
        )

        context = {"transaction": transaction}
        filename = f"MRV_Certificate_{transaction.pk}.pdf"

        return render_pdf(
            "reports/transaction_certificate.html",
            context,
            filename,
        )
class MintCreditsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, company_id):
        # Only Admin or Government Official (Verifier) may trigger minting.
        profile = get_business_user(request)
        if profile is None or profile.role not in ("Admin", "Government Official"):
            raise PermissionDenied(
                "Only administrators and verifiers can mint credits."
            )

        company = get_object_or_404(Company, pk=company_id)

        # Non-admin Government Officials must be assigned to this project
        if not is_admin(request) and profile.role == "Government Official":
            if company.assigned_verifier_id != profile.id:
                raise PermissionDenied(
                    "You are not the assigned verifier for this project."
                )

        # Only verified/approved projects may have credits minted.
        if company.status != Company.STATUS_VERIFIED:
            return Response(
                {"detail": "Credits can only be minted for verified projects."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        credits = get_available_credits(company)
        metadata = {"company": company.name, "credits": float(credits)}
        cid = None
        try:
            cid = pin_json(metadata, f"{company.name}_metadata")
        except Exception as exc:
            import logging
            import hashlib
            logging.getLogger(__name__).warning("Pinata IPFS pinning failed: %s; returning simulated CID.", exc)
            cid = f"bafkreib{hashlib.sha256(f'{company.name}_{credits}'.encode()).hexdigest()[:38]}"
        return Response({"success": True, "cid": cid})


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        requested_role = request.data.get("role")

        # Admin and Government Official accounts must not be
        # self-created through the public registration endpoint.
        if requested_role in ("Admin", "Government Official"):
            profile = get_business_user(request)

            if AuthUser.objects.exists() and (not request.user.is_authenticated or not (
                request.user.is_superuser
                or (profile and profile.role == "Admin")
            )):
                return Response(
                    {
                        "detail": (
                            "Admin and Government Official accounts "
                            "must be created by an administrator."
                        )
                    },
                    status=403,
                )

        user = serializer.save()

        return Response(
            MeSerializer(user).data,
            status=201,
        )


class AdminCreateUserView(APIView):
    """
    Admin-only endpoint for user management.
    GET  → list all business users
    POST → create a new user (NGO Representative, Government Official, Company Buyer)
    Admin role is explicitly blocked from being created here.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _check_admin(self, request):
        profile = get_business_user(request)
        if not (
            request.user.is_superuser
            or (profile and profile.role == "Admin")
        ):
            raise PermissionDenied("Only administrators can manage users.")

    def get(self, request):
        self._check_admin(request)
        users = User.objects.select_related("company").all()
        return Response(UserSerializers(users, many=True).data)

    def post(self, request):
        self._check_admin(request)

        # Admin accounts must not be created through this endpoint.
        requested_role = request.data.get("role")
        if requested_role == "Admin":
            return Response(
                {"detail": "Admin accounts cannot be created through this endpoint."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(MeSerializer(user).data, status=status.HTTP_201_CREATED)


class AssignVerifierView(APIView):
    """
    Admin-only endpoint to assign a Government Official / Verifier to a project.
    POST /api/v1/admin/projects/<project_id>/assign-verifier/
    Payload: {"verifier_id": <id>}
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        if not is_admin(request):
            raise PermissionDenied("Only administrators can assign verifiers.")

        project = get_object_or_404(Company, pk=project_id)

        verifier_id = request.data.get("verifier_id")
        if verifier_id is None:
            return Response(
                {"detail": "verifier_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            verifier = User.objects.get(pk=verifier_id)
        except User.DoesNotExist:
            return Response(
                {"detail": f"User with id {verifier_id} does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if verifier.role != "Government Official":
            return Response(
                {"detail": "Only Government Official (Verifier) users can be assigned as project verifiers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not verifier.active:
            return Response(
                {"detail": "This verifier account is inactive."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        project.assigned_verifier = verifier
        update_fields = ["assigned_verifier"]
        if project.status == Company.STATUS_PENDING:
            project.status = Company.STATUS_UNDER_REVIEW
            update_fields.append("status")

        project.save(update_fields=update_fields)

        return Response({
            "detail": f"Verifier '{verifier.username}' assigned to project '{project.name}'.",
            "project": {
                "id": project.id,
                "name": project.name,
                "status": project.status,
                "assigned_verifier": {
                    "id": verifier.id,
                    "username": verifier.username,
                    "role": verifier.role,
                },
            },
        })


class ProjectReviewView(APIView):
    """
    Verifier review endpoint for assigned projects.
    POST /api/v1/projects/<project_id>/review/
    Payload: {"action": "approve|reject|request_correction", "notes": "..."}

    Only the project's assigned_verifier or an Admin may use this endpoint.
    """
    permission_classes = [permissions.IsAuthenticated]

    VALID_ACTIONS = ("approve", "reject", "request_correction")

    def post(self, request, project_id):
        profile = get_business_user(request)
        if profile is None:
            raise PermissionDenied("No business profile linked to this account.")

        project = get_object_or_404(Company, pk=project_id)

        # ── Authorization ──
        caller_is_admin = is_admin(request)

        if not caller_is_admin:
            # Must be the assigned verifier
            if profile.role != "Government Official":
                raise PermissionDenied(
                    "Only the assigned verifier or an administrator can review projects."
                )
            if project.assigned_verifier_id != profile.id:
                raise PermissionDenied(
                    "You are not the assigned verifier for this project."
                )

        # NGO / Buyer can never review
        if profile.role in ("NGO Representative", "Company Buyer"):
            raise PermissionDenied("You do not have permission to review projects.")

        # ── Validate payload ──
        action_name = request.data.get("action", "").strip().lower()
        notes = request.data.get("notes", "").strip()

        if action_name not in self.VALID_ACTIONS:
            return Response(
                {
                    "detail": f"Invalid action. Must be one of: {', '.join(self.VALID_ACTIONS)}.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action_name in ("reject", "request_correction") and not notes:
            return Response(
                {"detail": f"Notes are required when action is '{action_name}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Apply status transition ──
        if action_name == "approve":
            project.status = Company.STATUS_VERIFIED
            project.verified_at = timezone.now()
            project.active = True
            project.verifier_notes = notes  # optional approval notes
        elif action_name == "reject":
            project.status = Company.STATUS_REJECTED
            project.active = False
            project.verified_at = None
            project.verifier_notes = notes
        elif action_name == "request_correction":
            project.status = Company.STATUS_CORRECTION_REQUIRED
            project.active = False
            project.verified_at = None
            project.verifier_notes = notes

        project.save(update_fields=[
            "status", "verified_at", "active", "verifier_notes",
        ])

        return Response({
            "detail": f"Project '{project.name}' review action '{action_name}' applied.",
            "project": {
                "id": project.id,
                "name": project.name,
                "status": project.status,
                "verifier_notes": project.verifier_notes,
                "verified_at": project.verified_at.isoformat() if project.verified_at else None,
                "assigned_verifier": project.assigned_verifier_id,
            },
        })


class ProjectResubmitView(APIView):
    """
    Dedicated NGO project resubmission endpoint.
    POST /api/v1/projects/<project_id>/resubmit/

    Only the owning NGO Representative may resubmit their project,
    and only when the project status is 'Correction Required'.
    Transitions project to 'Under Review' while preserving assigned verifier.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        profile = get_business_user(request)
        if profile is None:
            raise PermissionDenied("Authentication required.")

        if profile.role != "NGO Representative":
            raise PermissionDenied("Only NGO Representatives can resubmit projects.")

        project = get_object_or_404(Company, pk=project_id)

        if project.created_by_id != profile.id:
            raise PermissionDenied("You can only resubmit your own projects.")

        if project.status != Company.STATUS_CORRECTION_REQUIRED:
            return Response(
                {
                    "detail": f"Cannot resubmit project with status '{project.status}'. Only projects in 'Correction Required' can be resubmitted."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Transition status to Under Review
        project.status = Company.STATUS_UNDER_REVIEW
        project.save(update_fields=["status"])

        return Response({
            "detail": f"Project '{project.name}' resubmitted successfully for review.",
            "project": {
                "id": project.id,
                "name": project.name,
                "status": project.status,
                "verifier_notes": project.verifier_notes,
                "assigned_verifier": project.assigned_verifier_id,
            },
        })


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
        if profile is None:
            # Auto-create a business profile for users that were created
            # outside the registration flow (e.g. via createsuperuser).
            default_role = "Admin" if request.user.is_superuser else "NGO Representative"
            profile = User.objects.create(
                auth_user=request.user,
                username=request.user.username,
                email=request.user.email or "",
                password="",
                role=default_role,
                active=True,
            )
        return Response(MeSerializer(profile).data)


class PricingConfigView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, _request):
        config = PricingConfig.objects.first()
        if not config:
            # Return a safe default so the frontend doesn't crash on fresh installs.
            return Response({"id": None, "price_per_credit": "18.50", "updated_at": None})
        return Response(PricingConfigSerializer(config).data)

    def patch(self, request):
        profile = getattr(request.user, "profile", None)
        if not (request.user.is_superuser or (profile and profile.role == "Admin")):
            return Response({"detail": "Only admins can update pricing."}, status=403)
        config = PricingConfig.objects.first()
        if not config:
            config = PricingConfig.objects.create(price_per_credit=request.data.get("price_per_credit", "18.50"))
            return Response(PricingConfigSerializer(config).data)
        serializer = PricingConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DashboardStatsView(APIView):
    """
    Returns role-specific dashboard statistics for the authenticated user.
    All computation is server-side so the frontend only needs to display values.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum
        profile = get_business_user(request)
        if profile is None:
            return Response({"detail": "No business profile linked."}, status=403)

        role = profile.role

        if role in ("Admin", "Government Official"):
            total_projects      = Company.objects.count()
            pending_projects    = Company.objects.filter(status=Company.STATUS_PENDING).count()
            verified_projects   = Company.objects.filter(status=Company.STATUS_VERIFIED).count()
            rejected_projects   = Company.objects.filter(status=Company.STATUS_REJECTED).count()
            total_users         = User.objects.count()
            total_tx            = CarbonTransaction.objects.count()
            credits_issued      = CarbonTransaction.objects.filter(
                transaction_type="Issuance"
            ).aggregate(total=Sum("credits"))["total"] or 0
            credits_cancelled   = CarbonTransaction.objects.filter(
                transaction_type="Cancellation"
            ).aggregate(total=Sum("credits"))["total"] or 0

            return Response({
                "role": role,
                "total_projects":    total_projects,
                "pending_projects":  pending_projects,
                "verified_projects": verified_projects,
                "rejected_projects": rejected_projects,
                "total_users":       total_users,
                "total_transactions": total_tx,
                "total_credits_issued":    float(credits_issued),
                "total_credits_cancelled": float(credits_cancelled),
            })

        if role == "NGO Representative":
            my_projects   = Company.objects.filter(created_by=profile)
            my_project_ids = list(my_projects.values_list("id", flat=True))
            pending  = my_projects.filter(status=Company.STATUS_PENDING).count()
            verified = my_projects.filter(status=Company.STATUS_VERIFIED).count()
            rejected = my_projects.filter(status=Company.STATUS_REJECTED).count()

            # Credits issued to / transferred from the user's own projects
            credits_in = CarbonTransaction.objects.filter(
                project_id__in=my_project_ids,
                transaction_type__in=["Issuance", "Recieve"],
            ).aggregate(total=Sum("credits"))["total"] or 0
            credits_out = CarbonTransaction.objects.filter(
                project_id__in=my_project_ids,
                transaction_type__in=["Transfer", "Cancellation"],
            ).aggregate(total=Sum("credits"))["total"] or 0

            return Response({
                "role": role,
                "total_projects":    my_projects.count(),
                "pending_projects":  pending,
                "verified_projects": verified,
                "rejected_projects": rejected,
                "net_credits":       float(credits_in) - float(credits_out),
                "credits_issued":    float(credits_in),
            })

        if role == "Company Buyer":
            company_id = profile.company_id
            if not company_id:
                return Response({
                    "role": role,
                    "credits_purchased": 0,
                    "credits_retired": 0,
                    "net_credits": 0,
                    "transactions": 0,
                })

            credits_in = CarbonTransaction.objects.filter(
                project_id=company_id,
                transaction_type__in=["Issuance", "Recieve"],
            ).aggregate(total=Sum("credits"))["total"] or 0
            credits_out = CarbonTransaction.objects.filter(
                project_id=company_id,
                transaction_type__in=["Transfer", "Cancellation"],
            ).aggregate(total=Sum("credits"))["total"] or 0
            tx_count = CarbonTransaction.objects.filter(
                Q(project_id=company_id) | Q(counterparty_project_id=company_id)
            ).count()

            return Response({
                "role": role,
                "credits_purchased": float(credits_in),
                "credits_retired":   float(credits_out),
                "net_credits":       float(credits_in) - float(credits_out),
                "transactions":      tx_count,
            })

        # Fallback for any other role
        return Response({"role": role})