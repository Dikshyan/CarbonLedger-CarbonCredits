from decimal import Decimal

from django.db import models
from django.db.models import CASCADE
from django.contrib.auth.models import User as AuthUser


class Company(models.Model):
    STATUS_PENDING  = "Pending"
    STATUS_VERIFIED = "Verified"
    STATUS_REJECTED = "Rejected"

    STATUS_CHOICES = (
        (STATUS_PENDING,  "Pending"),
        (STATUS_VERIFIED, "Verified"),
        (STATUS_REJECTED, "Rejected"),
    )

    name       = models.CharField(max_length=200)
    location   = models.CharField(max_length=200)
    about      = models.TextField()
    type       = models.CharField(
        max_length=100,
        choices=(
            ("Blue Carbon Project",   "Blue Carbon Project"),
            ("Buyer Company",         "Buyer Company"),
            ("Verifier Organization", "Verifier Organization"),
            ("IT",                    "IT"),
            ("Credit Transfer",       "Credit Transfer"),
        ),
    )
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    added_date     = models.DateTimeField(auto_now=True)
    active         = models.BooleanField(default=True)
    wallet_address = models.CharField(max_length=42, blank=True, null=True)
    latitude       = models.DecimalField(max_digits=9,  decimal_places=6, blank=True, null=True)
    longitude      = models.DecimalField(max_digits=9,  decimal_places=6, blank=True, null=True)
    estimated_area_hectares          = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    expected_carbon_sequestration    = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    # Credential & Verification fields for NGO / Corporate onboarding
    registration_number = models.CharField(max_length=100, blank=True, null=True, help_text="Official registration / tax / NGO identifier")
    contact_email       = models.EmailField(blank=True, null=True, help_text="Primary official contact email")
    contact_phone       = models.CharField(max_length=50, blank=True, null=True, help_text="Contact phone number")
    credential_document = models.CharField(max_length=500, blank=True, null=True, help_text="Link or URL to credential document / charter")
    rejection_reason    = models.TextField(blank=True, null=True, help_text="Reason for rejection if application is rejected")
    reviewed_at         = models.DateTimeField(blank=True, null=True)
    reviewed_by         = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_companies")

    # AI Explorer Extracted Project Fields
    project_scope       = models.TextField(blank=True, null=True, help_text="AI-extracted project scope and ecosystem rationale")
    objectives          = models.TextField(blank=True, null=True, help_text="AI-extracted quantifiable conservation & MRV objectives")
    estimated_budget    = models.CharField(max_length=100, blank=True, null=True, help_text="AI-estimated restoration & audit budget")
    target_demographics = models.TextField(blank=True, null=True, help_text="AI-identified local community stakeholders")

    def __str__(self):
        return self.name


class User(models.Model):
    auth_user = models.OneToOneField(
        AuthUser, on_delete=CASCADE, related_name="profile", null=True, blank=True
    )
    username   = models.CharField(max_length=50)
    email      = models.CharField(max_length=50)
    password   = models.CharField(max_length=10)
    role       = models.CharField(
        max_length=100,
        choices=(
            ("Admin",                "Admin"),
            ("Government Official",  "Government Official"),
            ("Company Buyer",        "Company Buyer"),
            ("NGO Representative",   "NGO Representative"),
            ("Verifier",             "Field Verifier"),
        ),
    )
    added_date = models.DateTimeField(auto_now=True)
    active     = models.BooleanField(default=True)
    company    = models.ForeignKey(Company, on_delete=CASCADE, null=True, blank=True)

    # Verifier profile attributes for task routing
    region           = models.CharField(max_length=150, blank=True, null=True, help_text="Operating region or territory")
    domain_expertise = models.CharField(max_length=200, blank=True, null=True, help_text="Field specializations, e.g. Mangrove Forests, Wetland Biomass, Soil Carbon")

    def __str__(self):
        return f"{self.username} ({self.role})"


class VerificationAssignment(models.Model):
    STATUS_ASSIGNED    = "Assigned"
    STATUS_IN_PROGRESS = "In Progress"
    STATUS_COMPLETED   = "Completed"
    STATUS_REVISION    = "Needs Revision"

    STATUS_CHOICES = (
        (STATUS_ASSIGNED,    "Assigned"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED,   "Completed"),
        (STATUS_REVISION,    "Needs Revision"),
    )

    PRIORITY_CHOICES = (
        ("Normal", "Normal"),
        ("High",   "High"),
        ("Urgent", "Urgent"),
    )

    project           = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="verification_tasks")
    verifier          = models.ForeignKey(User, on_delete=models.CASCADE, related_name="assigned_verifications")
    assigned_by       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="delegated_verifications")
    assigned_date     = models.DateTimeField(auto_now_add=True)
    due_date          = models.DateField(blank=True, null=True)
    priority          = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="Normal")
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ASSIGNED)
    notes             = models.TextField(blank=True, null=True, help_text="Government official instructions or focus areas")
    field_report      = models.TextField(blank=True, null=True, help_text="Verifier findings and audit notes")
    evidence_document = models.CharField(max_length=500, blank=True, null=True, help_text="MRV audit document or IPFS hash")
    completed_at      = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-assigned_date"]

    def __str__(self):
        return f"Task #{self.id}: {self.project.name} -> {self.verifier.username} [{self.status}]"


class CarbonTransaction(models.Model):
    project            = models.ForeignKey(Company, on_delete=models.CASCADE)
    counterparty_project = models.ForeignKey(
        Company, on_delete=models.CASCADE, null=True, blank=True,
        related_name="counterparty_transactions",
    )
    credits            = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type   = models.CharField(
        max_length=50,
        choices=(
            ("Issuance",     "Issuance"),
            ("Transfer",     "Transfer"),
            ("Recieve",      "Recieve"),
            ("Verification", "Verification"),
            ("Validation",   "Validation"),
            ("Cancellation", "Cancellation"),
        ),
    )
    initiated_by  = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at    = models.DateTimeField(auto_now_add=True)
    ipfs_cid      = models.CharField(max_length=100, blank=True, null=True)
    tx_hash       = models.CharField(max_length=100, blank=True, null=True)
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
    updated_at       = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"${self.price_per_credit} per credit"