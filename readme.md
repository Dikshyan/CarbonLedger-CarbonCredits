# 🌱 CarbonLedger

A blockchain-enabled **Blue Carbon Monitoring, Reporting, and Verification (MRV)** platform developed for **Smart India Hackathon (SIH)**.

---

## 📚 Documentation

- [Project Architecture](ARCHITECTURE.md)
- [API Documentation](API.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Environment Variables](.env.example)

# Tech Stack

| Module | Technology |
|---------|------------|
| Frontend | React + Vite + pnpm |
| Backend | Django REST Framework |
| AI Service | FastAPI + Google Earth Engine + Scikit-learn |
| Blockchain | Solidity + Hardhat + Ethers.js |
| Database | MongoDB / PostgreSQL |
| Storage | Pinata IPFS |
| Maps | Leaflet / Mapbox |

---

# Project Structure

```
CarbonLedger/
│
├── frontend/              # React Application
├── backend/               # Django Backend
├── ai-service/            # FastAPI AI Service
├── blockchain/            # Smart Contracts
├── docs/                  # Documentation
├── shared/                # Shared API Schemas
│
├── README.md
├── .env.example
├── .gitignore
└── package.json
```

---

# Team Responsibilities

## 👨‍💻 Member 1 — AI & Remote Sensing

```
ai-service/
```

Responsible for

- Google Earth Engine
- Sentinel-2
- Landsat
- NDVI
- Mangrove Detection
- Carbon Estimation

---

## 👨‍💻 Member 2 — Blockchain

```
blockchain/
```

Responsible for

- Solidity
- Hardhat
- Polygon
- Smart Contracts
- Carbon Credits
- MetaMask

---

## 👨‍💻 Member 3 — Backend

```
backend/
```

Responsible for

- Django REST APIs
- Authentication
- Database
- AI Integration
- Blockchain Integration
- MRV Reports

---

## 👨‍💻 Member 4 — Frontend

```
frontend/
```

Responsible for

- Landing Page
- Dashboard
- Maps
- Charts
- User Interface

---

## 👨‍💻 Member 5 — DevOps

Responsible for

- Integration
- Deployment
- Testing
- Docker
- Performance

---

## 👨‍💻 Member 6 — Documentation

Responsible for

- PPT
- Architecture
- Documentation
- Demo
- SIH Presentation

---

# Backend Structure

```
backend/

├── config/                 # Django Project Configuration
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
│
├── apps/                   # Django Apps
│   ├── authentication/
│   ├── users/
│   ├── projects/
│   ├── reports/
│   ├── marketplace/
│   ├── blockchain_api/
│   ├── ai/
│   └── core/
│
├── services/
│
├── utils/
│
├── static/
├── media/
│
├── manage.py
└── requirements.txt
```

---

# Django Folder Organization

Instead of

```
backend/
│
├── users/
├── authentication/
├── projects/
```

All apps are placed inside

```
backend/apps/
```

This keeps the project organized as it grows.

---

# IMPORTANT

Create an empty file:

```
backend/apps/__init__.py
```

Without this file Django cannot import the apps correctly.

---

# INSTALLED_APPS

Since the apps are inside the **apps** folder, use

```python
INSTALLED_APPS = [

    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "apps.authentication",
    "apps.users",
    "apps.projects",
    "apps.reports",
    "apps.marketplace",
    "apps.blockchain_api",
    "apps.ai",
    "apps.core",
]
```

---

# Update apps.py

Each Django app contains an `apps.py`.

Example

```
backend/apps/users/apps.py
```

Change

```python
name = "users"
```

to

```python
name = "apps.users"
```

Do the same for every app.

Example

```python
name = "apps.authentication"
name = "apps.projects"
name = "apps.reports"
name = "apps.marketplace"
name = "apps.blockchain_api"
name = "apps.ai"
name = "apps.core"
```

---

# Rename Django Project Folder

Rename

```
backend/backend
```

to

```
backend/config
```

Update the following files

### manage.py

```python
DJANGO_SETTINGS_MODULE = "config.settings"
```

### config/asgi.py

```python
DJANGO_SETTINGS_MODULE = "config.settings"
```

### config/wsgi.py

```python
DJANGO_SETTINGS_MODULE = "config.settings"
```

### config/settings.py

```python
ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"

ASGI_APPLICATION = "config.asgi.application"
```

---

# API Routing

```
config/urls.py
```

```python
urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/auth/", include("apps.authentication.urls")),
    path("api/users/", include("apps.users.urls")),
    path("api/projects/", include("apps.projects.urls")),
    path("api/reports/", include("apps.reports.urls")),
    path("api/blockchain/", include("apps.blockchain_api.urls")),
    path("api/marketplace/", include("apps.marketplace.urls")),
    path("api/ai/", include("apps.ai.urls")),
]
```

---

# Git Workflow

Never push directly to **main**.

```
main

develop

feature/frontend

feature/backend

feature/ai

feature/blockchain

feature/devops

feature/docs
```

---

# Installation

## Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

---

## Backend

```bash
cd backend

python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

python manage.py migrate

python manage.py runserver
```

---

## AI Service

```bash
cd ai-service

python -m venv venv

pip install -r requirements.txt

uvicorn app:app --reload
```

---

## Blockchain

```bash
cd blockchain

pnpm install

pnpm hardhat compile
```

---

# Coding Standards

- Create a separate Git branch for every feature.
- Never commit `.env`, `node_modules`, or virtual environments.
- Write meaningful commit messages.
- Open a Pull Request before merging into `develop`.
- Keep API contracts in the `shared/` folder updated.

---

# Project Workflow

1. Register Blue Carbon Project
2. Fetch Sentinel-2 Images
3. Calculate NDVI
4. Detect Mangroves
5. Estimate Carbon Storage
6. Generate MRV Report
7. Upload Report to IPFS
8. Store IPFS Hash on Polygon
9. Verifier Approval
10. Mint Carbon Credits
11. Display Dashboard
12. Marketplace Trading
13. Continuous Monitoring