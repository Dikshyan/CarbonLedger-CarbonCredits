import requests
from django.conf import settings

PINATA_BASE = "https://api.pinata.cloud"


class PinataError(Exception):
    pass


def _headers():
    return {"Authorization": f"Bearer {settings.PINATA_JWT}"}


def pin_json(data: dict, name: str) -> str:
    """Pin a JSON object (e.g. transaction record) and return its CID."""
    resp = requests.post(
        f"{PINATA_BASE}/pinning/pinJSONToIPFS",
        json={
            "pinataContent": data,
            "pinataMetadata": {"name": name},
            "pinataOptions": {"cidVersion": 1},
        },
        headers=_headers(),
        timeout=15,
    )
    if resp.status_code != 200:
        raise PinataError(resp.text)
    return resp.json()["IpfsHash"]


def pin_file(file_obj, name: str) -> str:
    """Pin a file (e.g. evidence/report) and return its CID."""
    files = {"file": (name, file_obj)}
    resp = requests.post(
        f"{PINATA_BASE}/pinning/pinFileToIPFS",
        files=files,
        data={"pinataMetadata": f'{{"name": "{name}"}}'},
        headers=_headers(),
        timeout=30,
    )
    if resp.status_code != 200:
        raise PinataError(resp.text)
    return resp.json()["IpfsHash"]


def gateway_url(cid: str) -> str:
    return f"https://{settings.PINATA_GATEWAY}/ipfs/{cid}"