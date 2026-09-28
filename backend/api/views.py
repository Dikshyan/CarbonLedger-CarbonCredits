from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status
from django.core.mail import send_mail
from django.conf import settings
from api.models import Company, User, CarbonTransaction, PricingConfig, VerificationAssignment
from api.serializers import (
    CompanySerializers, UserSerializers, CarbonTransactionSerializer,
    RegisterSerializer, MeSerializer, PricingConfigSerializer,
    VerificationAssignmentSerializer,
)
from rest_framework.decorators import action
from rest_framework.response import Response
from api.permissions import CanInitiateTransactionType, get_requesting_user, get_business_user
from django.utils import timezone
from api.reports import render_pdf
from api.models import get_available_credits
from api.pinata import pin_json
from rest_framework.views import APIView
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied



class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializers
    permission_classes = [permissions.IsAuthenticated]

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

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def verify(self, request, pk=None):
        business_user = get_requesting_user(request)
        if not business_user or business_user.role not in ("Admin", "Government Official"):
            return Response({"detail": "Only Admins and Government Officials can verify organizations."}, status=403)

        company = get_object_or_404(Company, pk=pk)
        company.status = Company.STATUS_VERIFIED
        company.active = True
        company.rejection_reason = None
        company.reviewed_at = timezone.now()
        company.reviewed_by = business_user
        company.save()

        # Send automated email notification
        recipients = []
        if company.contact_email:
            recipients.append(company.contact_email)
        for u in company.user_set.all():
            if u.email and u.email not in recipients:
                recipients.append(u.email)

        if recipients:
            subject = f"[BlueChain Registry] Registration Approved: {company.name}"
            message = (
                f"Dear {company.name} Team,\n\n"
                f"We are pleased to inform you that your registration on the BlueChain Blue Carbon Registry "
                f"has been officially VERIFIED by {business_user.username} ({business_user.role}).\n\n"
                f"Organization Details:\n"
                f"- Name: {company.name}\n"
                f"- Type: {company.type}\n"
                f"- Location: {company.location}\n"
                f"- Status: Verified\n\n"
                f"Your account is now active. You may now access the registry to register projects, "
                f"issue credits, and participate in compliance and marketplace transactions.\n\n"
                f"Best regards,\nBlueChain Registry Administration"
            )
            try:
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipients, fail_silently=True)
            except Exception:
                pass

        return Response(CompanySerializers(company, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reject(self, request, pk=None):
        business_user = get_requesting_user(request)
        if not business_user or business_user.role not in ("Admin", "Government Official"):
            return Response({"detail": "Only Admins and Government Officials can reject organizations."}, status=403)

        company = get_object_or_404(Company, pk=pk)
        reason = request.data.get("reason", "Registration credentials could not be verified by registry administrators.")
        company.status = Company.STATUS_REJECTED
        company.active = False
        company.rejection_reason = reason
        company.reviewed_at = timezone.now()
        company.reviewed_by = business_user
        company.save()

        # Send automated email notification
        recipients = []
        if company.contact_email:
            recipients.append(company.contact_email)
        for u in company.user_set.all():
            if u.email and u.email not in recipients:
                recipients.append(u.email)

        if recipients:
            subject = f"[BlueChain Registry] Registration Status Update: {company.name}"
            message = (
                f"Dear {company.name} Team,\n\n"
                f"Thank you for submitting your registration to the BlueChain Blue Carbon Registry.\n\n"
                f"After careful review of your submitted credentials, your registration application could "
                f"not be verified at this time.\n\n"
                f"Reason for rejection:\n{reason}\n\n"
                f"If you have additional credential documents or clarification, please reach out to the registry administration.\n\n"
                f"Best regards,\nBlueChain Registry Administration"
            )
            try:
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipients, fail_silently=True)
            except Exception:
                pass

        return Response(CompanySerializers(company, context={'request': request}).data)


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializers
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business_user = get_requesting_user(self.request)

        if business_user is None:
            return User.objects.none()

        if business_user.role in ("Admin", "Government Official"):
            role_param = self.request.query_params.get("role")
            if role_param:
                return User.objects.filter(role=role_param)
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
        return self.partial_update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        business_user = get_requesting_user(self.request)
        if not business_user:
            return Response({"detail": "Authentication required."}, status=401)

        instance = self.get_object()
        # Allow Admin / Gov Official or self update
        if business_user.role not in ("Admin", "Government Official") and business_user.id != instance.id:
            return Response({"detail": "Permission denied."}, status=403)

        allowed_fields = ["region", "domain_expertise", "active"]
        for field in allowed_fields:
            if field in request.data:
                setattr(instance, field, request.data[field])
        instance.save()
        return Response(UserSerializers(instance, context={'request': request}).data)

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Users cannot be deleted through this endpoint."},
            status=405
        )


class VerificationAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = VerificationAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business_user = get_requesting_user(self.request)
        if business_user is None:
            return VerificationAssignment.objects.none()

        qs = VerificationAssignment.objects.all().select_related("project", "verifier", "assigned_by")

        # Admin and Government Official see everything
        if business_user.role in ("Admin", "Government Official"):
            status_param = self.request.query_params.get("status")
            if status_param:
                qs = qs.filter(status=status_param)
            verifier_param = self.request.query_params.get("verifier_id")
            if verifier_param:
                qs = qs.filter(verifier_id=verifier_param)
            project_param = self.request.query_params.get("project_id")
            if project_param:
                qs = qs.filter(project_id=project_param)
            return qs

        # Verifiers only see tasks assigned to them
        if business_user.role == "Verifier":
            return qs.filter(verifier=business_user)

        # NGO Representative / Company Buyer see tasks for their company's projects
        if business_user.company_id:
            return qs.filter(project_id=business_user.company_id)

        return VerificationAssignment.objects.none()

    def perform_create(self, serializer):
        business_user = get_requesting_user(self.request)
        if not business_user or business_user.role not in ("Admin", "Government Official"):
            raise PermissionDenied("Only Government Officials and Admins can assign verifiers.")

        assignment = serializer.save(assigned_by=business_user)

        # Notify verifier via email
        verifier = assignment.verifier
        if verifier.email:
            subject = f"[BlueChain] New Verification Assignment: {assignment.project.name} ({assignment.priority} Priority)"
            message = (
                f"Dear {verifier.username},\n\n"
                f"Government Official {business_user.username} has assigned you to conduct field/MRV verification for:\n\n"
                f"Project: {assignment.project.name}\n"
                f"Location: {assignment.project.location}\n"
                f"Priority: {assignment.priority}\n"
                f"Due Date: {assignment.due_date or 'Standard schedule'}\n"
                f"Official Instructions: {assignment.notes or 'Please conduct standard baseline MRV audit and compliance check.'}\n\n"
                f"Log in to your BlueChain dashboard to review project data, satellite coordinates, and submit your field report.\n\n"
                f"Best regards,\nBlueChain Ministry Oversight"
            )
            try:
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [verifier.email], fail_silently=True)
            except Exception:
                pass

    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """
        Automated verifier routing and recommendation engine:
        Evaluates regional proximity, domain expertise match, and active workload balance.
        """
        project_id = request.query_params.get("project_id")
        project = None
        if project_id:
            project = Company.objects.filter(pk=project_id).first()

        verifiers = User.objects.filter(role="Verifier", active=True)
        results = []

        project_loc = (project.location.lower() if project and project.location else "")
        project_text = f"{project.name} {project.about or ''} {project.location or ''}".lower() if project else ""

        for v in verifiers:
            active_tasks = v.assigned_verifications.filter(status__in=["Assigned", "In Progress"]).count()
            score = 50
            reasons = []

            # Workload balance (up to 30 points)
            if active_tasks == 0:
                score += 30
                reasons.append("Zero active workload (Immediate availability)")
            elif active_tasks <= 2:
                score += 20
                reasons.append(f"Light workload ({active_tasks} active tasks)")
            elif active_tasks <= 4:
                score += 10
                reasons.append(f"Moderate workload ({active_tasks} active tasks)")
            else:
                score -= 10
                reasons.append(f"Heavy workload ({active_tasks} active tasks)")

            # Region matching (up to 25 points)
            v_region = (v.region or "").lower()
            if v_region and project_loc:
                if v_region in project_loc or project_loc in v_region or any(word in project_loc for word in v_region.split()):
                    score += 25
                    reasons.append(f"Regional jurisdiction match: {v.region}")

            # Domain expertise matching (up to 25 points)
            v_exp = (v.domain_expertise or "").lower()
            if v_exp and project_text:
                keywords = [w.strip() for w in v_exp.replace(",", " ").split() if len(w.strip()) > 3]
                matched_kw = [kw for kw in keywords if kw in project_text]
                if matched_kw:
                    score += 25
                    reasons.append(f"Domain specialist: {', '.join(matched_kw)}")

            results.append({
                "verifier_id": v.id,
                "verifier_name": v.username,
                "email": v.email,
                "region": v.region or "All Regions",
                "domain_expertise": v.domain_expertise or "General Coastal MRV",
                "active_tasks": active_tasks,
                "score": min(100, max(0, score)),
                "reasons": reasons,
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return Response(results)

    @action(detail=True, methods=['post'])
    def submit_report(self, request, pk=None):
        assignment = get_object_or_404(VerificationAssignment, pk=pk)
        business_user = get_requesting_user(request)

        if not business_user or (
            business_user.role not in ("Admin", "Government Official")
            and business_user.id != assignment.verifier_id
        ):
            return Response({"detail": "Not authorized to submit field report for this task."}, status=403)

        report = request.data.get("field_report")
        status_val = request.data.get("status", VerificationAssignment.STATUS_COMPLETED)
        evidence_doc = request.data.get("evidence_document")

        if report:
            assignment.field_report = report
        if status_val in dict(VerificationAssignment.STATUS_CHOICES):
            assignment.status = status_val
        if evidence_doc:
            assignment.evidence_document = evidence_doc

        if status_val == VerificationAssignment.STATUS_COMPLETED:
            assignment.completed_at = timezone.now()

        assignment.save()
        return Response(VerificationAssignmentSerializer(assignment).data)

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

    def post(self, _request, company_id):
        company = get_object_or_404(Company, pk=company_id)
        credits = get_available_credits(company)
        metadata = {"company": company.name, "credits": float(credits)}
        cid = pin_json(metadata, f"{company.name}_metadata")
        return Response({"success": True, "cid": cid})


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        requested_role = request.data.get("role")

        # Admin and Government Official accounts must not be
        # self-created through the public registration endpoint.
        if requested_role in ("Admin", "Government Official"):
            profile = getattr(request.user, "profile", None)

            if not request.user.is_authenticated or not (
                request.user.is_superuser
                or (profile and profile.role == "Admin")
            ):
                return Response(
                    {
                        "detail": (
                            "Admin and Government Official accounts "
                            "must be created by an administrator."
                        )
                    },
                    status=403,
                )

        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        return Response(
            MeSerializer(user).data,
            status=201,
        )


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
        if profile is None:
            return Response({"detail": "No business profile linked to this account."}, status=404)
        return Response(MeSerializer(profile).data)


class PricingConfigView(APIView):
    permission_classes = [permissions.IsAuthenticated]

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
        serializer = PricingConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)