import requests
from django.conf import settings


class BlockchainServiceError(Exception):
    """Raised when the Node blockchain microservice returns an error or is unreachable."""
    pass


def _request(method, path, payload=None):
    url = f"{settings.BLOCKCHAIN_SERVICE_URL}{path}"
    try:
        resp = requests.request(method, url, json=payload, timeout=15)
    except requests.RequestException as e:
        raise BlockchainServiceError(f"Could not reach blockchain service: {e}")

    if not resp.ok:
        try:
            detail = resp.json().get("error", resp.text)
        except ValueError:
            detail = resp.text
        raise BlockchainServiceError(detail)

    return resp.json()


def create_wallet(owner_id):
    return _request("POST", "/wallet/create", {"ownerId": owner_id})


def get_wallet(owner_id):
    return _request("GET", f"/wallet/{owner_id}")


def mint_credits(owner_id, amount, cid):
    return _request("POST", "/contract/mint", {
        "ownerId": owner_id, "amount": amount, "cid": cid
    })


def transfer_credits(from_owner_id, to_owner_id, amount):
    return _request("POST", "/contract/transfer", {
        "fromOwnerId": from_owner_id, "toOwnerId": to_owner_id, "amount": amount
    })


def get_balance(owner_id):
    return _request("GET", f"/contract/balance/{owner_id}")