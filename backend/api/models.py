from decimal import Decimal

from django.db import models
from django.db.models import CASCADE
from django.contrib.auth.models import User as AuthUser


class Company(models.Model):
    name=models.CharField(max_length=50)
    location=models.CharField(max_length=50)
    about=models.TextField()
    type=models.CharField(max_length=100,choices=
                          (
                              ("Blue Carbon Project", "Blue Carbon Project"),
                              ("Buyer Company", "Buyer Company"),
                              ("Verifier Organization", "Verifier Organization"),
                              ("IT", "IT"),
                              ('Credit Transfer', 'Credit Transfer'),
                              ))
    added_date=models.DateTimeField(auto_now=True)
    active=models.BooleanField(default=True)
    wallet_address=models.CharField(max_length=42,blank=True,null=True)
    latitude=models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude=models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    estimated_area_hectares=models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    expected_carbon_sequestration=models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return self.name


class User(models.Model):
    auth_user = models.OneToOneField(AuthUser, on_delete=CASCADE, related_name="profile", null=True, blank=True)
    username=models.CharField(max_length=50)
    email=models.CharField(max_length=50)
    password=models.CharField(max_length=10)
    role=models.CharField(max_length=100,choices=(
        ('Admin','Admin'),
        ('Government Official','Government Official'),
        ('Company Buyer','Company Buyer'),
        ('NGO Representative',"NGO Representative")))
    added_date=models.DateTimeField(auto_now=True)
    active=models.BooleanField(default=True)
    company=models.ForeignKey(Company, on_delete=CASCADE, null=True, blank=True)

    def __str__(self):
        return self.username


class CarbonTransaction(models.Model):
    project = models.ForeignKey(Company, on_delete=models.CASCADE)
    counterparty_project = models.ForeignKey(
        Company, on_delete=models.CASCADE, null=True, blank=True,
        related_name="counterparty_transactions"
    )
    credits = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=50, choices=(
        ('Issuance', 'Issuance'),
        ('Transfer', 'Transfer'),
        ('Recieve', 'Recieve'),
        ('Verification', 'Verification'),
        ('Validation', 'Validation'),
        ('Cancellation', 'Cancellation'),
    ))
    initiated_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    ipfs_cid = models.CharField(max_length=100, blank=True, null=True)
    tx_hash = models.CharField(max_length=100, blank=True, null=True)
    wallet_address = models.CharField(max_length=100, blank=True, null=True)


from django.db.models import Sum

def get_available_credits(company):
    incoming = CarbonTransaction.objects.filter(
        project=company, transaction_type__in=["Issuance", "Recieve"]
    ).aggregate(total=Sum("credits"))["total"] or 0
    outgoing = CarbonTransaction.objects.filter(
        project=company, transaction_type__in=["Transfer", "Cancellation"]
    ).aggregate(total=Sum("credits"))["total"] or 0
    return incoming - outgoing


class PricingConfig(models.Model):
    price_per_credit = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("15.00"))
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"${self.price_per_credit} per credit"