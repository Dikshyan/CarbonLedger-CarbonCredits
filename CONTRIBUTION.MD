# Contributing to CarbonLedger

Welcome to CarbonLedger!

This document describes how every team member should contribute to the project.

---

# Git Workflow

Never push directly to **main**.

Branches:

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

# Development Flow

```
Create Feature Branch

↓

Write Code

↓

Commit Changes

↓

Push Branch

↓

Create Pull Request

↓

Code Review

↓

Merge into develop

↓

Merge develop → main
```

---

# Branch Naming

```
feature/frontend-login

feature/backend-authentication

feature/ai-ndvi

feature/blockchain-token

bugfix/login

hotfix/api
```

---

# Commit Message Convention

```
feat: add user authentication

fix: resolve login issue

docs: update README

style: improve dashboard UI

refactor: optimize AI service
```

---

# Coding Standards

## React

- Functional Components
- Hooks
- Axios
- Tailwind

---

## Django

- Django REST Framework
- Serializers
- ViewSets
- Services Layer

---

## FastAPI

- Modular APIs
- Pydantic Models
- Async Endpoints

---

## Blockchain

- Solidity ^0.8.x
- TypeScript
- Hardhat
- Ethers.js

---

# Folder Ownership

| Member | Folder |
|---------|--------|
| Member 1 | ai-service |
| Member 2 | blockchain |
| Member 3 | backend |
| Member 4 | frontend |
| Member 5 | integration |
| Member 6 | docs |

---

# Before Every Commit

✔ Project builds successfully

✔ No console errors

✔ No unused imports

✔ No secrets committed

✔ Update README if necessary

✔ Update API.md if API changed