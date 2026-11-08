---
title: "API Error Catalog and Status Codes"
description: "Comprehensive directory of MedAssist AI REST API error codes, HTTP status mappings, JSON response envelopes, and client remediation policies."
quadrant: reference
audience: [api-consumer, developer]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["backend/app.js", "backend/middleware/authToken.js", "backend/controllers/chatController.js"]
---

# API Error Catalog and Status Codes

Every error emitted by the MedAssist AI API adheres to a deterministic JSON schema featuring a machine-readable `code`, a human-readable `message`, and an `x-request-id` correlation identifier for tracing.

---

## 1. Standard Error Envelope

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable explanation of error condition.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

The matching `x-request-id` header is attached to every HTTP response.

---

## 2. Error Code Directory

| HTTP Status | Error Code | Description / Typical Trigger | Client Remediation | Retryable? |
|:---:|:---|:---|:---|:---:|
| **400** | `INVALID_INPUT` | Malformed JSON payload, missing required schema field, or invalid parameter types. | Inspect schema and validate request body format before resubmitting. | No |
| **401** | `AUTH_REQUIRED` | Missing, empty, or unparseable access token. | Redirect user to login or request new token via `POST /api/auth/refresh`. | No |
| **401** | `ACCESS_EXPIRED` | Access JWT has exceeded its 15-minute lifespan. | Execute single-flight token refresh via Web Locks mutex. | Yes (after refresh) |
| **403** | `ORIGIN_DENIED` | Request origin header does not match configured `CLIENT_ORIGIN` whitelist, or browser reports `Sec-Fetch-Site: cross-site`. | Check CORS configuration and origin domain headers. | No |
| **403** | `ORIGIN_REQUIRED` | Authenticated request received with cookies in production but lacking an `Origin` or `Referer` header. | Supply valid origin header in client requests. | No |
| **404** | `NOT_FOUND` | The requested route path or specific resource ID does not exist in the database. | Confirm URL path and ID parameter validity. | No |
| **413** | `BODY_TOO_LARGE` | Request payload exceeds configured Express body-parser threshold. | Truncate document attachment or split chat message payload. | No |
| **429** | `RATE_LIMITED` | Client has exceeded route rate limit thresholds (e.g., auth attempts or inference requests). | Implement exponential backoff and wait until rate limit window resets. | Yes (after delay) |
| **500** | `INTERNAL` | Unhandled runtime exception in backend controller or database connection fault. | Check backend logs using the provided `requestId`. | No |
| **503** | `AI_UNAVAILABLE` | Primary and fallback AI model providers timed out, returned 5xx, or are not configured. | Failover to alternate provider or configure custom BYOK credentials. | Yes |
| **503** | `DATABASE_UNAVAILABLE` | MongoDB connection pool failed or liveness check failed (`/api/ready`). | Check MongoDB service status and connection URI. | Yes |

---

## 3. Client Retry & Error Handling Guidance

When integrating with the API:
1. **Handle `ACCESS_EXPIRED` Automatically:** Catch 401 with `code: "ACCESS_EXPIRED"` in client interceptors (such as Axios or Fetch wrappers) to trigger a silent token refresh before retrying the initial request.
2. **Preserve `requestId` in Error Logs:** Log the `requestId` from the JSON response or the `x-request-id` response header when submitting issue tickets or querying server logs.
3. **Exponential Backoff on 429 and 503:** On 429 (Rate Limited) or 503 (AI Unavailable), retry with randomized exponential backoff:
   $$t_{\text{wait}} = \min(t_{\text{max}}, t_{\text{base}} \times 2^{\text{attempt}} + \text{jitter})$$

---

**Evidence:** `backend/app.js`, `backend/middleware/authToken.js`, `backend/controllers/chatController.js`.
