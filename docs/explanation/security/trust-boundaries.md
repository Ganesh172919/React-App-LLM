---
title: "Trust Boundaries & Network Isolation"
description: "Detailed explanation of network isolation, security zones, and defense-in-depth boundaries in MedAssist AI"
quadrant: explanation
audience: [security, architect]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 180
applies_to: ">=1.0.0"
source_of_truth: ["backend/app.js", "backend/server.js", "deploy/nginx/conf.d/default.conf", "docs/records/threat-models/system.md"]
---

# Trust Boundaries & Network Isolation

MedAssist AI implements defense-in-depth architecture across four distinct trust boundaries, ensuring that untrusted user input cannot directly manipulate persistence stores or bypass clinical safety controls.

---

## 1. Trust Boundary Architecture

```mermaid
flowchart LR
    Browser["User Browser (React SPA)"]
    Ingress["Edge / Nginx Reverse Proxy"]
    API["Node.js Express API"]
    DB[("MongoDB Database")]
    External["Google Gemini / PubMed APIs"]

    Browser -->|TB1: Public Internet (TLS 1.3)| Ingress
    Ingress -->|TB2: Loopback / VPC Network| API
    API -->|TB3: Authenticated Connection| DB
    API -->|TB4: Egress TLS + Redacted Payload| External
```

---

## 2. Boundary Analysis & Defensive Invariants

### Trust Boundary 1: Client to Ingress Gateway
- **Nature of Boundary:** Crosses the public untrusted network.
- **Threats:** Man-in-the-middle (MITM), cross-site scripting (XSS), credential interception, DDoS.
- **Controls:**
  - Mandatory TLS 1.3 encryption with strict HSTS (`max-age=31536000`).
  - Security headers enforced: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Content-Security-Policy`.
  - Rate limiting enforced per IP and per endpoint category (`auth`, `ai`, `settings`).

### Trust Boundary 2: Ingress Gateway to Node.js API
- **Nature of Boundary:** Private bridge / loopback network within container mesh.
- **Threats:** Host header spoofing, cross-origin request forgery (CSRF), malicious payloads.
- **Controls:**
  - Origin verification: `CLIENT_ORIGIN` whitelist strictly limits permitted browser domains.
  - JWT Access Tokens and rotating SHA-256 hashed refresh tokens stored exclusively in `HttpOnly`, `SameSite=Lax` (or `Strict`) cookies.
  - Request body limits: JSON payload size capped at 1MB globally, prompt string capped at 4,000 characters.

### Trust Boundary 3: Node.js API to MongoDB Data Tier
- **Nature of Boundary:** Application runtime to persistent database storage.
- **Threats:** NoSQL injection, document size exhaustion, unauthorized cross-tenant data access.
- **Controls:**
  - Mongoose schema typing and strict query isolation: all chat lookups require `{ sessionId, userId }`.
  - Document size guard: `POST /api/chat/save` verifies `$bsonSize < 12MB` and `$size < 1000` messages before allowing writes.
  - Master provider keys encrypted at rest using AES-256-GCM (`USER_API_KEY_ENCRYPTION_KEY`).

### Trust Boundary 4: Node.js API to External Model & Literature APIs
- **Nature of Boundary:** Outbound egress to third-party providers (Google Gemini, Groq, NCBI PubMed).
- **Threats:** Transmission of PHI/PII, credential leakage in stack traces, model provider outages.
- **Controls:**
  - `redactSensitiveText()` strips identified patient identifiers, phone numbers, and emails prior to payload construction.
  - Single-flight Web Locks token renewal mutex prevents refresh storming.
  - Upstream errors catch blocks scrub API keys and return sanitized error codes (`AI_UNAVAILABLE`).

---

**Evidence:** `backend/app.js`, `backend/controllers/aiController.js`, `backend/controllers/chatController.js`, `docs/records/threat-models/system.md`.
