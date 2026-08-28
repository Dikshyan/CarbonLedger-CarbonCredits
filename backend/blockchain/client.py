import requests
from django.conf import settings

BLOCKCHAIN_SERVICE_URL = getattr(settings, "BLOCKCHAIN_SERVICE_URL", "http://localhost:4000")


class BlockchainServiceError(Exception):
    pass


def get_project(project_id):
    resp = requests.get(f"{BLOCKCHAIN_SERVICE_URL}/project/{project_id}", timeout=15)
    if resp.status_code != 200:
        raise BlockchainServiceError(resp.text)
    return resp.json()


def register_project(ngo_name, project_cid):
    resp = requests.post(
        f"{BLOCKCHAIN_SERVICE_URL}/project/register",
        json={"ngoName": ngo_name, "projectCID": project_cid},
        timeout=30,
    )
    if resp.status_code != 200:
        raise BlockchainServiceError(resp.text)
    return resp.json()


def upload_mrv(project_id, cid):
    resp = requests.post(
        f"{BLOCKCHAIN_SERVICE_URL}/project/{project_id}/mrv",
        json={"cid": cid},
        timeout=30,
    )
    if resp.status_code != 200:
        raise BlockchainServiceError(resp.text)
    return resp.json()


def transfer_credits(from_project_id, to_project_id, amount):
    resp = requests.post(
        f"{BLOCKCHAIN_SERVICE_URL}/credits/transfer",
        json={"fromProjectId": from_project_id, "toProjectId": to_project_id, "amount": amount},
        timeout=30,
    )
    if resp.status_code != 200:
        raise BlockchainServiceError(resp.text)
    return resp.json()


def retire_credits(project_id, amount):
    resp = requests.post(
        f"{BLOCKCHAIN_SERVICE_URL}/credits/retire",
        json={"projectId": project_id, "amount": amount},
        timeout=30,
    )
    if resp.status_code != 200:
        raise BlockchainServiceError(resp.text)
    return resp.json()


def mint_credits(project_id, amount, cid=None):
    raise BlockchainServiceError(
        "Minting requires the verifier wallet, which this service does not yet hold."
    )
    
