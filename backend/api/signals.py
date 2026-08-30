import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Company
from blockchain.client import create_wallet

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Company)
def create_company_wallet(sender, instance, created, **kwargs):
    if created and not instance.wallet_address:
        try:
            result = create_wallet(str(instance.User_id))
            instance.wallet_address = result["address"]
            instance.save(update_fields=["wallet_address"])
        except Exception as e:
            logger.error(f"Failed to create blockchain wallet for company {instance.User_id}: {e}")