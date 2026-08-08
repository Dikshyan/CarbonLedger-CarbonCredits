from django.shortcuts import render
from rest_framework import viewsets, permissions
from api.models import Company,User ,CarbonTransaction
from api.serializers import CompanySerializers,UserSerializers,CarbonTransactionSerializer
from rest_framework.decorators import action  
from rest_framework.response import Response  
from api.permissions import CanInitiateTransactionType, get_requesting_user
from django.utils import timezone
from api.reports import render_pdf
from api.models import get_available_credits
from blockchain.client import mint_credits
from api.pinata import pin_json
from rest_framework.views import APIView

# Create your views here.


class CompanyViewSet(viewsets.ModelViewSet):
    queryset=Company.objects.all()
    serializer_class=CompanySerializers
    
    #For custom api , url: "CarbonLedger/1/Users"
    
    @action(detail=True,methods=['get'])
    def Users(self , request ,pk=None):
        company=Company.objects.get(pk=pk)
        us=User.objects.filter(company=company)
        us_serializer=UserSerializers(us,many=True,context={'request': request})
        return Response(us_serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def report(self, request, pk=None):
        company = Company.objects.get(pk=pk)
        requesting_user = get_requesting_user(request)
        if requesting_user is None:
            return Response({"detail": "user_id query param is required."}, status=400)
        if requesting_user.role == "Company Buyer" and requesting_user.company_id != company.pk: #type: ignore
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
    queryset=User.objects.all()
    serializer_class=UserSerializers

from .permissions import CanInitiateTransactionType


class CarbonTransactionViewSet(viewsets.ModelViewSet):
    queryset = CarbonTransaction.objects.all()
    serializer_class = CarbonTransactionSerializer
    permission_classes = [permissions.IsAuthenticated, CanInitiateTransactionType]

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def certificate(self, request, pk=None):
        transaction = CarbonTransaction.objects.get(pk=pk)
        requesting_user = get_requesting_user(request)
        if requesting_user is None:
            return Response({"detail": "user_id query param is required."}, status=400)
        if requesting_user.role == "Company Buyer" and requesting_user.company_id != transaction.project_id: #type: ignore
            return Response({"detail": "Not authorized to view this transaction's certificate."}, status=403)

        context = {"transaction": transaction}
        filename = f"MRV_Certificate_{transaction.pk}.pdf"
        return render_pdf("reports/transaction_certificate.html", context, filename)

class MintCreditsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, company_id):
        company = Company.objects.get(pk=company_id)
        credits = get_available_credits(company)
        metadata = {
       "company": company.name,
       "credits": float(credits),
        }
        cid = pin_json(
            metadata,
            f"{company.name}_metadata"
        )
        return Response({
            "success": True,
            "cid": cid
            })