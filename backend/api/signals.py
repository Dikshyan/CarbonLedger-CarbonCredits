import logging
from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver
from api.models import Company, CarbonTransaction, User

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Company)
def create_company_initial_issuance(sender, instance, created, **kwargs):
    if created:
        logger.info(
            "Company created: %s (ID: %s). Auto-issuing initial carbon credits.",
            instance.name,
            instance.id,
        )
        credits_to_issue = instance.expected_carbon_sequestration
        if not credits_to_issue or credits_to_issue <= 0:
            credits_to_issue = Decimal("1000")

        if not CarbonTransaction.objects.filter(project=instance, transaction_type="Issuance").exists():
            admin_user = User.objects.filter(role="Admin").first() or User.objects.first()
            if admin_user:
                CarbonTransaction.objects.create(
                    project=instance,
                    credits=credits_to_issue,
                    transaction_type="Issuance",
                    initiated_by=admin_user,
                )