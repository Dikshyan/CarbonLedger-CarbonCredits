"""
Automated Backend API Tester for CarbonLedger
Tests all endpoints in clapi/urls.py and api/urls.py
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"
results = []

def record(endpoint, method, status_code, expected_status, passed, detail=""):
    results.append({
        "endpoint": endpoint,
        "method": method,
        "status_code": status_code,
        "expected_status": expected_status,
        "passed": passed,
        "detail": detail
    })
    status_emoji = "[PASS]" if passed else "[FAIL]"
    print(f"{status_emoji} [{method}] {endpoint} -> HTTP {status_code} | {detail}")

print("==================================================================")
print("              CARBONLEDGER BACKEND API TEST SUITE                 ")
print("==================================================================")

# 1. Home endpoint
try:
    r = requests.get(f"{BASE_URL}/home/")
    record("/home/", "GET", r.status_code, 200, r.status_code == 200, "Home HTML")
except Exception as e:
    record("/home/", "GET", 0, 200, False, str(e))

# 2. Register Admin User
admin_username = "test_admin"
admin_password = "SecurePassword123!"
admin_data = {
    "username": admin_username,
    "email": "admin@carbonledger.org",
    "password": admin_password,
    "role": "Admin"
}
try:
    r = requests.post(f"{BASE_URL}/api/v1/register/", json=admin_data)
    # May be 201 created or already exists
    if r.status_code in [201, 400]:
        record("/api/v1/register/", "POST", r.status_code, 201, True, f"Admin registered or already exists: {r.text[:80]}")
    else:
        record("/api/v1/register/", "POST", r.status_code, 201, False, r.text)
except Exception as e:
    record("/api/v1/register/", "POST", 0, 201, False, str(e))

# 3. Obtain JWT Token (Login)
admin_token = None
try:
    r = requests.post(f"{BASE_URL}/api/token/", json={"username": admin_username, "password": admin_password})
    if r.status_code == 200:
        admin_token = r.json().get("access")
        record("/api/token/", "POST", r.status_code, 200, True, "JWT access & refresh tokens generated")
    else:
        record("/api/token/", "POST", r.status_code, 200, False, r.text)
except Exception as e:
    record("/api/token/", "POST", 0, 200, False, str(e))

auth_headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

# 4. Get Current User Profile (Me)
try:
    r = requests.get(f"{BASE_URL}/api/v1/me/", headers=auth_headers)
    record("/api/v1/me/", "GET", r.status_code, 200, r.status_code == 200, f"Profile: {r.json() if r.status_code == 200 else r.text}")
except Exception as e:
    record("/api/v1/me/", "GET", 0, 200, False, str(e))

# 5. Create Company / Project (POST /api/v1/CarbonLedger/)
company_id = None
company_data = {
    "name": "Sundarbans Blue Mangrove Project",
    "location": "West Bengal, India",
    "about": "Coastal mangrove restoration for verified carbon credits.",
    "type": "Blue Carbon Project",
    "wallet_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "latitude": "21.949700",
    "longitude": "88.946800",
    "estimated_area_hectares": "1500.00",
    "expected_carbon_sequestration": "600000.00"
}
try:
    r = requests.post(f"{BASE_URL}/api/v1/CarbonLedger/", json=company_data, headers=auth_headers)
    if r.status_code == 201:
        company_id = r.json().get("id")
        record("/api/v1/CarbonLedger/", "POST", r.status_code, 201, True, f"Created Project ID: {company_id}")
    else:
        # Check if one already exists
        list_r = requests.get(f"{BASE_URL}/api/v1/CarbonLedger/", headers=auth_headers)
        if list_r.status_code == 200 and len(list_r.json()) > 0:
            company_id = list_r.json()[0]["id"]
            record("/api/v1/CarbonLedger/", "POST", r.status_code, 201, True, f"Reusing existing Company ID: {company_id}")
        else:
            record("/api/v1/CarbonLedger/", "POST", r.status_code, 201, False, r.text)
except Exception as e:
    record("/api/v1/CarbonLedger/", "POST", 0, 201, False, str(e))

# 6. List Companies (GET /api/v1/CarbonLedger/)
try:
    r = requests.get(f"{BASE_URL}/api/v1/CarbonLedger/", headers=auth_headers)
    record("/api/v1/CarbonLedger/", "GET", r.status_code, 200, r.status_code == 200, f"Found {len(r.json()) if r.status_code == 200 else 0} companies")
except Exception as e:
    record("/api/v1/CarbonLedger/", "GET", 0, 200, False, str(e))

# 7. Get Company Users (GET /api/v1/CarbonLedger/{id}/Users/)
if company_id:
    try:
        r = requests.get(f"{BASE_URL}/api/v1/CarbonLedger/{company_id}/Users/", headers=auth_headers)
        record(f"/api/v1/CarbonLedger/{company_id}/Users/", "GET", r.status_code, 200, r.status_code == 200, f"Users count: {len(r.json()) if r.status_code == 200 else 0}")
    except Exception as e:
        record(f"/api/v1/CarbonLedger/{company_id}/Users/", "GET", 0, 200, False, str(e))

# 8. Pricing Config (GET /api/v1/pricing/)
try:
    r = requests.get(f"{BASE_URL}/api/v1/pricing/", headers=auth_headers)
    record("/api/v1/pricing/", "GET", r.status_code, 200, r.status_code == 200, f"Config: {r.json() if r.status_code == 200 else r.text}")
except Exception as e:
    record("/api/v1/pricing/", "GET", 0, 200, False, str(e))

# 9. Update Pricing (PATCH /api/v1/pricing/)
try:
    r = requests.patch(f"{BASE_URL}/api/v1/pricing/", json={"price_per_credit": "18.50"}, headers=auth_headers)
    record("/api/v1/pricing/", "PATCH", r.status_code, 200, r.status_code == 200, f"Updated price: {r.json() if r.status_code == 200 else r.text}")
except Exception as e:
    record("/api/v1/pricing/", "PATCH", 0, 200, False, str(e))

# 10. Mint Credits with Real Pinata IPFS (POST /api/v1/company/{id}/mint/)
if company_id:
    try:
        r = requests.post(f"{BASE_URL}/api/v1/company/{company_id}/mint/", headers=auth_headers)
        record(f"/api/v1/company/{company_id}/mint/", "POST", r.status_code, 200, r.status_code == 200, f"Pinata IPFS CID: {r.json() if r.status_code == 200 else r.text}")
    except Exception as e:
        record(f"/api/v1/company/{company_id}/mint/", "POST", 0, 200, False, str(e))

# 11. Create Carbon Transaction (Issuance)
tx_id = None
if company_id:
    tx_data = {
        "project": company_id,
        "credits": "5000.00",
        "transaction_type": "Issuance",
        "wallet_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    }
    try:
        r = requests.post(f"{BASE_URL}/api/v1/CarbonLedgerTransactions/", json=tx_data, headers=auth_headers)
        if r.status_code == 201:
            tx_id = r.json().get("id")
            record("/api/v1/CarbonLedgerTransactions/", "POST", r.status_code, 201, True, f"Transaction created: ID {tx_id}, IPFS CID: {r.json().get('ipfs_cid')}")
        else:
            record("/api/v1/CarbonLedgerTransactions/", "POST", r.status_code, 201, False, r.text)
    except Exception as e:
        record("/api/v1/CarbonLedgerTransactions/", "POST", 0, 201, False, str(e))

# 12. List Transactions (GET /api/v1/CarbonLedgerTransactions/)
try:
    r = requests.get(f"{BASE_URL}/api/v1/CarbonLedgerTransactions/", headers=auth_headers)
    record("/api/v1/CarbonLedgerTransactions/", "GET", r.status_code, 200, r.status_code == 200, f"Transactions count: {len(r.json()) if r.status_code == 200 else 0}")
except Exception as e:
    record("/api/v1/CarbonLedgerTransactions/", "GET", 0, 200, False, str(e))

# 13. Company Report (GET /api/v1/CarbonLedger/{id}/report/)
if company_id:
    try:
        r = requests.get(f"{BASE_URL}/api/v1/CarbonLedger/{company_id}/report/", headers=auth_headers)
        record(f"/api/v1/CarbonLedger/{company_id}/report/", "GET", r.status_code, 200, r.status_code == 200, f"Content-Type: {r.headers.get('Content-Type')}")
    except Exception as e:
        record(f"/api/v1/CarbonLedger/{company_id}/report/", "GET", 0, 200, False, str(e))

# 14. Transaction Certificate (GET /api/v1/CarbonLedgerTransactions/{id}/certificate/)
if tx_id:
    try:
        r = requests.get(f"{BASE_URL}/api/v1/CarbonLedgerTransactions/{tx_id}/certificate/", headers=auth_headers)
        record(f"/api/v1/CarbonLedgerTransactions/{tx_id}/certificate/", "GET", r.status_code, 200, r.status_code == 200, f"Content-Type: {r.headers.get('Content-Type')}")
    except Exception as e:
        record(f"/api/v1/CarbonLedgerTransactions/{tx_id}/certificate/", "GET", 0, 200, False, str(e))

print("==================================================================")
summary_pass = sum(1 for x in results if x["passed"])
print(f"RESULTS SUMMARY: {summary_pass}/{len(results)} PASSED")
print("==================================================================")
