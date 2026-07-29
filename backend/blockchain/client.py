import requests
from django.conf import settings

BLOCKCHAIN_SERVICE_URL = getattr(settings, "BLOCKCHAIN_SERVICE_URL", "http://localhost:4000")

def create_wallet(owner_id):
    resp = requests.post(f"{BLOCKCHAIN_SERVICE_URL}/wallet/create", json={"ownerId": owner_id}, timeout=15)
    resp.raise_for_status()
    return resp.json()

def get_wallet_address(owner_id):
    resp = requests.get(f"{BLOCKCHAIN_SERVICE_URL}/wallet/{owner_id}", timeout=15)
    resp.raise_for_status()
    return resp.json()

def mint_credits(owner_id, amount, cid):
    resp = requests.post(
        f"{BLOCKCHAIN_SERVICE_URL}/contract/mint",
        json={
            "ownerId": owner_id,
            "amount": amount,
            "cid": cid
        },
        timeout=30
    )
    resp.raise_for_status()
    return resp.json()