from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions
from api.models import Company, User, CarbonTransaction, PricingConfig
from api.serializers import (
    CompanySerializers, UserSerializers, CarbonTransactionSerializer,
    RegisterSerializer, MeSerializer, PricingConfigSerializer,
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
from rest_framework import permissions, status, viewsets
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