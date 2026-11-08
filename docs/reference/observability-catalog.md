---
title: "Observability, Logging, and Probes Catalog"
description: "Directory of MedAssist AI structured JSON log fields, request correlation IDs, health probe contracts, and alert-to-runbook mappings."
quadrant: reference
audience: [operator, developer]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["backend/app.js", "backend/server.js", "docs/runbooks/"]
---

# Observability, Logging, and Probes Catalog

This catalog outlines the logging formats, correlation identifiers, monitoring health checks, and operational alert mappings used in MedAssist AI.

---

## 1. Structured Logging Format

When `STRUCTURED_LOGS=true` is enabled in production, the application emits one-line JSON log objects on stdout and stderr.

### HTTP Access Log Schema
Emitted on the completion of every incoming HTTP request:

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "route": "/api/chat",
  "status": 200,
  "durationMs": 142
}
```

### Application Error Log Schema
Emitted when an unhandled exception or critical service fault occurs:

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "AI_UNAVAILABLE",
  "status": 503,
  "error": "Google Gemini upstream API returned 429 ResourceExhausted",
  "timestamp": "2026-11-08T12:00:00.000Z"
}
```

---

## 2. Request Correlation IDs

Every inbound HTTP request receives or inherits an `x-request-id` correlation identifier:
- If the ingress reverse proxy (Nginx or AWS ALB) sends an `X-Request-Id` header matching `/^[a-zA-Z0-9-]{8,80}$/`, the backend preserves it.
- Otherwise, the backend generates a random UUIDv4 via `crypto.randomUUID()`.
- The correlation ID is attached to:
  1. The response header: `x-request-id: <uuid>`
  2. Every structured JSON log line for that request lifecycle.
  3. All error response payloads (`{ "requestId": "..." }`).

---

## 3. Health & Readiness Probe Contracts

| Probe Route | Method | Success Code | Failure Code | Checks Performed | Recommended Polling Interval |
|:---|:---:|:---:|:---:|:---|:---:|
| `/api/health` | GET | `200 OK` | (Does not fail) | Process liveness only; verifies Express event loop is responding. | 10 seconds |
| `/api/ready` | GET | `200 OK` | `503 Unavailable` | Verifies active MongoDB connection pool (`mongoose.connection.readyState === 1`) and AI provider configuration. | 5 seconds (k8s/docker) |

Example `/api/ready` healthy payload:
```json
{
  "status": "ready",
  "database": "connected",
  "aiConfigured": true,
  "emailConfigured": false,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 4. Operational Alert to Runbook Cross-Reference

| Alert Name | Severity | Trigger Condition | Runbook Guide |
|:---|:---:|:---|:---|
| **HighApiErrorRate** | SEV-1 / SEV-2 | HTTP 5xx error rate exceeds 2% over a 5-minute window | [runbooks/api-error-rate-high.md](../runbooks/api-error-rate-high.md) |
| **DbConnectionSaturation** | SEV-1 | MongoDB connection pool utilization exceeds 85% or replica set failover occurs | [runbooks/db-connection-saturation.md](../runbooks/db-connection-saturation.md) |
| **LlmProviderOutageOrQuota** | SEV-2 | Primary AI engine returns continuous HTTP 429 or 503 responses for > 2 minutes | [runbooks/llm-provider-outage-or-rate-limit.md](../runbooks/llm-provider-outage-or-rate-limit.md) |
| **DrugInteractionScreenerAlert** | SEV-3 | Spike in DDI rule detections or reported false-positive regex dispute | [runbooks/drug-interaction-screener-alert.md](../runbooks/drug-interaction-screener-alert.md) |

---

**Evidence:** `backend/app.js`, `backend/server.js`, `docs/runbooks/index.md`.
