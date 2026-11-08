---
title: "How to Deploy MedAssist AI with Docker Compose"
description: "Production operations guide for orchestrating containerized MedAssist AI services with Docker Compose, Nginx ingress, MongoDB authentication, and health checks."
quadrant: how-to
audience: [operator, developer]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["docker-compose.yml", "deploy/README.md", "deploy/mongo-init.js", "frontend/nginx.conf"]
---

# How to Deploy MedAssist AI with Docker Compose

This guide provides instructions for deploying MedAssist AI into a production or staging containerized environment using Docker Compose.

---

## Architecture Overview

The containerized stack includes three isolated network services:
1. **Frontend / Ingress (`frontend`):** Alpine Nginx serving compiled Vite assets on port 8080 and reverse-proxying `/api` and WebSocket `/ws` requests to the backend.
2. **Backend API (`backend`):** Node.js 20+ Express server running on port 5000 in cluster or standalone mode.
3. **Database (`mongo`):** MongoDB 7.0 Community container with authenticated internal network isolation.

---

## Prerequisites

- **Docker Engine:** v24.0 or newer (`docker --version`)
- **Docker Compose:** v2.20 or newer (`docker compose version`)
- Outbound network access for NCBI PubMed E-Utilities and Google Gemini / external model APIs.

---

## Step 1: Configure Environment Variables

Create `.env` at the repository root based on `.env.docker.example`:

```bash
cp .env.docker.example .env
```

Populate the required cryptographic secrets and provider credentials:

```ini
# Core ports & origins
PORT=5000
PUBLIC_ORIGIN=http://your-domain.example.com:8080
CLIENT_ORIGIN=http://your-domain.example.com:8080
NODE_ENV=production

# MongoDB Authentication
MONGO_ROOT_PASSWORD=replace-with-32-byte-hex-secret
MONGO_APP_PASSWORD=replace-with-32-byte-hex-secret
MONGO_URI=mongodb://medassist_app:replace-with-32-byte-hex-secret@mongo:27017/medassist?authSource=medassist

# Cookie Security (must be true when terminating SSL on ingress)
COOKIE_SECURE=true
TRUST_PROXY=true
STRUCTURED_LOGS=true

# JWT Secrets (generate with: openssl rand -hex 32)
JWT_ACCESS_TOKEN=replace-with-32-byte-hex-secret
JWT_REFRESH_TOKEN=replace-with-32-byte-hex-secret
JWT_VERIFICATION_TOKEN=replace-with-32-byte-hex-secret
JWT_RESET_TOKEN=replace-with-32-byte-hex-secret

# Provider Credential Vault Key (generate with: openssl rand -hex 32)
USER_API_KEY_ENCRYPTION_KEY=replace-with-64-hex-character-key
USER_API_KEY_ENCRYPTION_KEY_VERSION=v1

# Primary AI Provider (Default Gemini)
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy-replace-with-your-key
GEMINI_MODEL=gemini-2.5-flash
```

---

## Step 2: Build and Launch Services

Execute the build and run containers in detached mode:

```bash
docker compose build --no-cache
docker compose up -d --wait
```

Verify running container status:

```bash
docker compose ps
```

Expected output:
```text
NAME                     IMAGE                 COMMAND                  SERVICE    STATUS
react-app-llm-backend    react-app-llm-backend "docker-entrypoint.s…"   backend    running (healthy)
react-app-llm-frontend   react-app-llm-frontend "/docker-entrypoint.…"   frontend   running (healthy)
react-app-llm-mongo      mongo:7.0             "docker-entrypoint.s…"   mongo      running (healthy)
```

---

## Step 3: Verify Health and Readiness Probes

Execute curl requests against the ingress port (8080):

```bash
# Basic Liveness Probe
curl --fail http://localhost:8080/api/health

# Readiness Probe (verifies active MongoDB connection pool)
curl --fail http://localhost:8080/api/ready
```

Expected response (`/api/ready`):
```json
{
  "status": "ready",
  "database": "connected",
  "uptime": 42.1,
  "timestamp": "2026-11-08T12:00:00.000Z"
}
```

---

## Step 4: Inspect Production Logs

To view streaming JSON structured logs across all services:

```bash
docker compose logs -f backend
```

---

## Step 5: Updating Services

To perform a zero-downtime rolling update:

```bash
git pull origin main
docker compose build backend
docker compose up -d --no-deps backend
docker compose ps
```

---

**Evidence:** `docker-compose.yml`, `deploy/README.md`, `deploy/mongo-init.js`, `frontend/nginx.conf`.
