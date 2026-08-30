# CarbonLedger API Reference

Comprehensive documentation for all REST API endpoints across the CarbonLedger MRV Platform.

---

## Base URLs
- **Backend API (Django REST Framework)**: `http://localhost:8000/api/v1`
- **Auth Endpoint (JWT)**: `http://localhost:8000/api/token`
- **AI Service (FastAPI)**: `http://localhost:8001`
- **Blockchain Bridge (Express)**: `http://localhost:4000`

---

## Authentication (`/api/token/` & `/api/v1/register/`)

### 1. Register User
- **Method**: `POST`
- **URL**: `/api/v1/register/`
- **Auth**: None
- **Request Body**:
```json
{
  "username": "sundarbans_ngo",
  "email": "ngo@sundarbans.org",
  "password": "SecurePassword123!",
  "role": "NGO Representative",
  "company": 1
}
```
> **Roles**: `Admin`, `Government Official`, `Company Buyer`, `NGO Representative`
- **Response** (`201 Created`):
```json
{
  "id": 1,
  "username": "sundarbans_ngo",
  "email": "ngo@sundarbans.org",
  "role": "NGO Representative",
  "company": 1,
  "active": true
}
```

### 2. Login (Obtain JWT)
- **Method**: `POST`
- **URL**: `/api/token/`
- **Request Body**:
```json
{
  "username": "sundarbans_ngo",
  "password": "SecurePassword123!"
}
```
- **Response** (`200 OK`):
```json
{
  "access": "eyJhbGciOi...",
  "refresh": "eyJhbGciOi..."
}
```

### 3. Get Current User Profile
- **Method**: `GET`
- **URL**: `/api/v1/me/`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`): User object.

---

## Projects / Companies (`/api/v1/CarbonLedger/`)

### 4. Create Project / Company
- **Method**: `POST`
- **URL**: `/api/v1/CarbonLedger/`
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Body**:
```json
{
  "name": "Sundarbans Blue Mangrove Project",
  "location": "West Bengal, India",
  "about": "Coastal mangrove restoration for verified carbon credits.",
  "type": "Blue Carbon Project",
  "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "latitude": "21.949700",
  "longitude": "88.946800",
  "estimated_area_hectares": "1500.00",
  "expected_carbon_sequestration": "600000.00"
}
```

### 5. List Projects
- **Method**: `GET`
- **URL**: `/api/v1/CarbonLedger/`

### 6. Get Project Users
- **Method**: `GET`
- **URL**: `/api/v1/CarbonLedger/{id}/Users/`

### 7. Download Project MRV Report
- **Method**: `GET`
- **URL**: `/api/v1/CarbonLedger/{id}/report/`

---

## Carbon Transactions (`/api/v1/CarbonLedgerTransactions/`)

### 8. Create Transaction
- **Method**: `POST`
- **URL**: `/api/v1/CarbonLedgerTransactions/`
- **Request Body**:
```json
{
  "project": 1,
  "counterparty_project": 2,
  "credits": "500.00",
  "transaction_type": "Transfer",
  "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
}
```
> **Transaction Types & Allowed Roles**:
> - `Issuance`: Admin, Government Official
> - `Transfer`: Company Buyer, Admin
> - `Recieve`: Company Buyer, Admin
> - `Verification`: Government Official, NGO Representative, Admin
> - `Validation`: Government Official, NGO Representative, Admin
> - `Cancellation`: Admin

### 9. Get Transaction Certificate
- **Method**: `GET`
- **URL**: `/api/v1/CarbonLedgerTransactions/{id}/certificate/`

---

## IPFS Minting & Pricing (`/api/v1/company/` & `/api/v1/pricing/`)

### 10. Mint Credits Metadata to Pinata IPFS
- **Method**: `POST`
- **URL**: `/api/v1/company/{id}/mint/`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "cid": "bafkreifu5gilbpkhjhem24lkosbsgbj3wtmsc3s7wspr6q6axvvylolm7i"
}
```

### 11. Get / Update Credit Pricing
- **GET**: `/api/v1/pricing/`
- **PATCH**: `/api/v1/pricing/` with `{"price_per_credit": "18.50"}` (Admin only)

---

## AI Service Endpoints (`:8001`)

### 12. Satellite Mangrove & Carbon Analysis
- **Method**: `POST`
- **URL**: `http://localhost:8001/analyze`
- **Request Body**:
```json
{
  "latitude": 21.94,
  "longitude": 88.94,
  "area_hectares": 1200.0,
  "project_name": "Sundarbans Delta"
}
```
- **Response** (`200 OK`):
```json
{
  "project_name": "Sundarbans Delta",
  "latitude": 21.94,
  "longitude": 88.94,
  "area_hectares": 1200.0,
  "ndvi_mean": 0.72,
  "mangrove_coverage_pct": 60.0,
  "estimated_carbon_tonnes": 288000.0,
  "estimated_credits": 288000,
  "confidence": "medium",
  "gee_mode": "stub"
}
```
