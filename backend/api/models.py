from django.db import models
from django.db.models import CASCADE
from django_mongodb_backend.fields import ObjectIdAutoField

# Create your models here.
class Company(models.Model):
    User_id=ObjectIdAutoField(primary_key=True)
    name=models.CharField(max_length=50)
    location=models.CharField(max_length=50)
    about=models.TextField()
    type=models.CharField(max_length=100,choices=
                          (
                              ("IT","IT"),
                              ('Credit Transfer','Credit Transfer')
                              ))
    added_date=models.DateTimeField(auto_now=True)
    active=models.BooleanField(default=True)
    wallet_address=models.CharField(max_length=42,blank=True,null=True)


    
    def __str__(self):
        return self.name
#User Model Below

class User(models.Model):
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
    company=models.ForeignKey(Company,on_delete=CASCADE)


class CarbonTransaction(models.Model):
    project = models.ForeignKey(Company, on_delete=models.CASCADE)
    credits = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=50, choices=(
        ('Issuance', 'Issuance'),
        ('Transfer', 'Transfer'),
        ('Recieve', 'Recieve'),
        ('Verification', 'Verification'),
        ('Validation', 'Validation'),
        ('Cancellatiobn', 'Cancellation'),
    ))
    initiated_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    ipfs_cid = models.CharField(max_length=100, blank=True, null=True)
    tx_hash = models.CharField(max_length=100, blank=True, null=True)          
    wallet_address = models.CharField(max_length=100, blank=True, null=True)   

from django.db.models import Sum

def get_available_credits(company):
    """Current credit balance for a company, derived from its transaction history."""
    incoming = CarbonTransaction.objects.filter(
        project=company, transaction_type__in=["Issuance", "Recieve"]
    ).aggregate(total=Sum("credits"))["total"] or 0
    outgoing = CarbonTransaction.objects.filter(
        project=company, transaction_type__in=["Transfer", "Cancellatiobn"]
    ).aggregate(total=Sum("credits"))["total"] or 0
    return incoming - outgoing