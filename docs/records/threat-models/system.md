---
title: "System STRIDE Threat Model"
description: "STRIDE threat model across client, ingress, Node.js API, MongoDB, and external AI providers"
quadrant: record
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 180
applies_to: ">=1.0.0"
---

# System STRIDE Threat Model

**Status:** Stable  
**Date:** 2026-11-08  
**Audience:** Security Reviewers, Backend Engineers, DevOps Operators  
**Technical Quadrant:** Record  

---

## 1. System Overview and Trust Boundaries

MedAssist operates as a full-stack clinical education assistant composed of a React single-page application (SPA), an Express.js Node.js API server, a MongoDB database, and external third-party medical information services (Google Gemini API, Hugging Face, and NCBI PubMed).

```mermaid
flowchart TD
    subgraph Untrusted["Untrusted Zone (Public Network)"]
        Browser["User Browser (React SPA)"]
    end

    subgraph DMZ["Ingress & Perimeter"]
        Ingress["Reverse Proxy / Nginx / ALB"]
    end

    subgraph ApplicationZone["Application Tier (Private VPC)"]
        API["Node.js Express API Server"]
        WS["WebSocket Service"]
        Safety["Deterministic DDI Screener (23 Rules)"]
    end

    subgraph DataZone["Data Tier (Encrypted at Rest)"]
        MongoDB[("MongoDB 7.x Database")]
    end

    subgraph ExternalZone["Third-Party External Services (TLS 1.3)"]
        Gemini["Google Gemini API"]
        HF["Hugging Face API"]
        PubMed["NCBI PubMed E-Utilities"]
    end

    Browser -->|HTTPS / WSS| Ingress
    Ingress -->|Reverse Proxy| API
    Ingress -->|Upgrade| WS
    API --> Safety
    API -->|Mongoose (SCRAM-SHA-256)| MongoDB
    API -->|HTTPS + Bearer Key| Gemini
    API -->|HTTPS + Bearer Key| HF
    API -->|HTTPS| PubMed
```

### Trust Boundaries
1. **TB1: Client to Ingress**: Crosses public internet. Untrusted input, potential MITM, session token transmission.
2. **TB2: Ingress to Node.js API**: Perimeter to application service boundary. Enforces TLS termination, CORS policy, and security headers.
3. **TB3: API to Database**: Application to data store boundary. Requires authenticated connection strings with SCRAM-SHA-256 authentication and network isolation.
4. **TB4: API to External AI Providers**: Boundary between MedAssist and third-party AI APIs. Egress of user prompts and ingress of generated text.

---

## 2. STRIDE Threat Analysis Matrix

| Threat ID | STRIDE Category | Component / Surface | Threat Description | Existing Defensive Mitigations | Residual Risk | Owner |
|:---|:---|:---|:---|:---|:---|:---|
| **T-01** | **Spoofing** | Authentication (`/api/auth/*`) | Attacker crafts forged JWT tokens to impersonate clinicians or users. | HMAC-SHA256 with 256-bit entropy keys (`JWT_ACCESS_TOKEN`, `JWT_REFRESH_TOKEN`). Refresh tokens stored in HTTP-only, SameSite cookies. | Low. Pinned secret rotation procedures required. | Security Lead |
| **T-02** | **Spoofing** | WebSocket (`/ws`) | Unauthenticated client connects to WebSocket and intercepts push updates. | WebSocket connection validates session cookie and user identity during upgrade handshake (`attachWebSockets`). | Low. Ephemeral socket session drops on cookie invalidation. | Backend Lead |
| **T-03** | **Tampering** | Chat Persistence (`POST /api/chat/save`) | Attacker submits altered or malicious AI messages to inject false medical history. | Generation handshake checks: `saveChat` requires valid `generationId` generated server-side. Messages are read directly from server-side `Generation` record, not client body. | Very Low. Client cannot forge server generation results. | Backend Lead |
| **T-04** | **Tampering** | Clinical Calculators Modal | Inadvertent zero-scoring or altered risk formulas leading to miscalculated clinical scores. | Explicit unassessed initial states, complete record gating before output, educational point bands only, no individual mortality predictions. | Low. Formula unit tests in Vitest verify 22 calculators. | Clinical Lead |
| **T-05** | **Repudiation** | User Actions & Audit | User denies taking an action, submitting a prompt, or generating advice. | User action timestamps, `exchangeId` UUID tracking, MongoDB change timestamps, and request correlation IDs (`req.id`). | Low. Centralized SIEM audit forwarding required for enterprise HIPAA compliance. | DevOps Lead |
| **T-06** | **Information Disclosure** | AI Chat Prompt (`/api/ai/chat`) | Accidental transmission of user PII/PHI (names, MRNs, phone numbers, emails) to external LLM providers. | `redactSensitiveText()` pre-screens and strips identified PII tokens before sending payloads to upstream providers. Stored in DB as redacted. | Medium. Regex PII redaction cannot detect all unstructured clinical identifiers without named-entity recognition (NER). | Privacy Lead |
| **T-07** | **Information Disclosure** | Provider Credentials (`/api/settings/keys`) | Compromise of user-supplied or system Gemini / Hugging Face API keys. | User provider API keys are encrypted at rest using AES-256-GCM via `USER_API_KEY_ENCRYPTION_KEY`. Keys are never echoed in logs or error traces. | Low. Managed KMS key rotation recommended for multi-tenant production. | Security Lead |
| **T-08** | **Denial of Service** | Upstream AI Flooding (`/api/ai/chat`) | Rapid automated prompts exhaust upstream LLM provider quota or server memory. | Rate limiting (`express-rate-limit`), request body length capped (4,000 characters), 35s `AbortController` timeout, and single-flight token renewal mutex (`navigator.locks`). | Low. Coordinated DDoS requires Cloudflare / WAF rate limiting. | DevOps Lead |
| **T-09** | **Denial of Service** | BSON Size Exhaustion | Malicious user sends thousands of messages to a single conversation to trigger 16MB MongoDB BSON limit. | `saveChat` enforces maximum 1,000 messages and checks `$bsonSize` under 12MB before allowing message insertion. | Very Low. Hard-capped at database layer. | Backend Lead |
| **T-10** | **Elevation of Privilege** | Chat History (`/api/chat/chats/:sessionId`) | Insecure direct object reference (IDOR) allowing User A to read or delete User B's conversations. | Every query explicitly scopes by `{ sessionId: req.params.sessionId, userId: req.user.id }`. | Very Low. Verified across integration test suites. | Backend Lead |

---

## 3. Residual Risk Assessment & Action Plan

1. **Unstructured PHI Redaction**:
   - *Current State*: Deterministic regex-based redaction (`redactSensitiveText`) handles common formats (emails, phone numbers, SSNs, credit card numbers).
   - *Mitigation Plan*: Integrate an on-premise clinical Named Entity Recognition (NER) pipeline (such as Presidio Medical or local transformer) for HIPAA compliance.
2. **Key Management**:
   - *Current State*: AES-256-GCM key defined via environment variable (`USER_API_KEY_ENCRYPTION_KEY`).
   - *Mitigation Plan*: Integrate AWS KMS or HashiCorp Vault for hardware-backed envelope encryption.

---

**Evidence:** `backend/controllers/aiController.js`, `backend/controllers/chatController.js`, `backend/services/privacyService.js`, `backend/services/interactionService.js`, `frontend/src/lib/api.js`, `docs/SECURITY_AND_MESSAGE_POLICY.md`.
