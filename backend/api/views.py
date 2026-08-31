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


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializers
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def Users(self, request, pk=None):
        company = get_object_or_404(Company, pk=pk)
        us = User.objects.filter(company=company)
        us_serializer = UserSerializers(us, many=True, context={'request': request})
        return Response(us_serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def report(self, request, pk=None):
        company = get_object_or_404(Company, pk=pk)
        requesting_user = get_requesting_user(request)
        if requesting_user is None:
            return Response({"detail": "No business profile linked to this account."}, status=403)
        if requesting_user.role == "Company Buyer" and requesting_user.company_id != company.pk:
            return Response({"detail": "Not authorized to view this company's report."}, status=403)
        transactions = CarbonTransaction.objects.filter(project=company).order_by('created_at')
        balance = get_available_credits(company)
        context = {
            "company": company,
            "transactions": transactions,
            "balance": balance,
            "generated_at": timezone.now(),
        }
        filename = f"MRV_Report_{company.name}.pdf"
        return render_pdf("reports/project_report.html", context, filename)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializers
    permission_classes = [permissions.IsAuthenticated]


class CarbonTransactionViewSet(viewsets.ModelViewSet):
    queryset = CarbonTransaction.objects.all()
    serializer_class = CarbonTransactionSerializer
    permission_classes = [permissions.IsAuthenticated, CanInitiateTransactionType]

    def perform_create(self, serializer):
        business_user = get_business_user(self.request)
        serializer.save(initiated_by=business_user)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def certificate(self, request, pk=None):
        transaction = get_object_or_404(CarbonTransaction, pk=pk)
        requesting_user = get_requesting_user(request)
        if requesting_user is None:
            return Response({"detail": "No business profile linked to this account."}, status=403)
        if requesting_user.role == "Company Buyer" and requesting_user.company_id != transaction.project.pk:
            return Response({"detail": "Not authorized to view this transaction's certificate."}, status=403)
        context = {"transaction": transaction}
        filename = f"MRV_Certificate_{transaction.pk}.pdf"
        return render_pdf("reports/transaction_certificate.html", context, filename)


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
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(MeSerializer(user).data, status=201)


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
            return Response({"detail": "No pricing configured."}, status=404)
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