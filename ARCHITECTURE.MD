# CarbonLedger Architecture

---

# High-Level Architecture

```
                    User
                      │
                      ▼
              React Frontend
                      │
          REST API / JWT
                      │
                      ▼
              Django Backend
      ┌─────────────┼─────────────┐
      │             │             │
      ▼             ▼             ▼
 FastAPI AI     MongoDB/IPFS   Blockchain
      │                          │
      ▼                          ▼
Google Earth Engine          Polygon
```

---

# Backend Responsibilities

- Authentication
- User Management
- Project Management
- Report Generation
- AI Integration
- Blockchain Integration

---

# AI Responsibilities

Input

```
Project Boundary
```

↓

Google Earth Engine

↓

Sentinel-2 Images

↓

NDVI

↓

Mangrove Detection

↓

Carbon Estimation

↓

JSON Output

---

# Blockchain Flow

MRV Report

↓

IPFS Upload

↓

Hash

↓

Verifier Approval

↓

Polygon Smart Contract

↓

Carbon Credits

---

# Database

Collections

```
Users

Projects

Reports

CarbonCredits

Transactions

Verifiers
```

---

# API Flow

```
React

↓

Django

↓

FastAPI

↓

Google Earth Engine
```

---

# Security

JWT Authentication

↓

Role-Based Access

↓

Wallet Verification

↓

Smart Contract Validation

↓

IPFS Integrity