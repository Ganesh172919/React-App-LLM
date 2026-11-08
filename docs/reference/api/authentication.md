---
title: "Authentication and Session Architecture Reference"
description: "Specification of access and refresh JWT lifecycles, Web Locks token renewal mutex, HTTP-only cookie security, and OAuth integration."
quadrant: reference
audience: [api-consumer, developer, security]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["backend/controllers/authController.js", "frontend/src/lib/api.js", "backend/middleware/authMiddleware.js"]
---

# Authentication and Session Architecture Reference

MedAssist AI implements a dual-token authentication model combining short-lived JSON Web Tokens (JWTs) with cryptographic refresh token rotation and client-side concurrency control.

---

## 1. Token Lifecycles & Cryptographic Storage

| Token Type | Lifespan | Transmission Mechanism | Storage Location | Invalidation Trigger |
|:---|:---:|:---|:---|:---|
| **Access Token** | 15 minutes | `Authorization: Bearer <JWT>` header | Client in-memory state (React AuthContext) | Expiration, user logout, or failed refresh |
| **Refresh Token** | 7 days | `refreshToken` cookie (HTTP-only, SameSite, Secure) | Client cookie jar; SHA-256 hash in MongoDB `User.refreshTokens` | Rotation upon use, user logout, or password change |
| **Verification Token** | 24 hours | URL query parameter `?token=<JWT>` | Sent via transactional email | Consumed upon email address verification |
| **Password Reset Token** | 1 hour | URL query parameter `?token=<JWT>` | Sent via transactional email | Consumed upon password reset completion |

---

## 2. Refresh Token Rotation & Hash Invariant

To mitigate token replay attacks:
1. When a client calls `POST /api/auth/refresh`, the server extracts the cookie `refreshToken`.
2. The server computes `crypto.createHash('sha256').update(token).digest('hex')`.
3. The server queries the database for a matching active `refreshTokenHash`.
4. If found, the existing hash is removed, a new refresh token and hash are generated, and the new cookie is returned alongside a fresh 15-minute access token.
5. If an already-rotated token is presented (potential replay), the server invalidates **all** active refresh tokens for that user account.

---

## 3. Client-Side Web Locks Refresh Mutex

In single-page applications with multiple active browser tabs or concurrent API requests, simultaneous token refresh attempts can cause race conditions where one request consumes a refresh token before the sibling request completes, triggering accidental session logout.

MedAssist AI eliminates this race condition in `frontend/src/lib/api.js` using the **W3C Web Locks API**:

```javascript
// frontend/src/lib/api.js
let refreshPromise = null;

export async function requestTokenRefresh() {
  if (refreshPromise) return refreshPromise;

  if (typeof navigator !== "undefined" && navigator.locks) {
    refreshPromise = navigator.locks.request("medassist-session-refresh", async () => {
      return executeRefreshNetworkCall();
    }).finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  // Fallback for environments without navigator.locks
  refreshPromise = executeRefreshNetworkCall().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}
```

Key features:
- **Single-Flight Concurrency:** Exactly one browser tab executes the network call to `POST /api/auth/refresh` at any time.
- **In-Memory Caching:** Sibling requests in the same tab await the active `refreshPromise`.
- **Zero Drift:** Prevents false replay alarms and keeps tokens synchronized across multiple open browser tabs.

---

## 4. Endpoints & Request Contracts

### `POST /api/auth/register`
Creates a new user record.
- **Request Body:** `{ "email": "user@example.com", "password": "...", "name": "Dr. Doe" }`
- **Response `201`:** `{ "user": { "id": "...", "email": "...", "name": "..." }, "accessToken": "..." }`
- **Cookies Set:** `refreshToken` (HttpOnly, SameSite=Strict, Path=/api/auth)

### `POST /api/auth/login`
Authenticates user credentials using bcrypt (10 rounds).
- **Request Body:** `{ "email": "user@example.com", "password": "..." }`
- **Response `200`:** `{ "user": { ... }, "accessToken": "..." }`
- **Cookies Set:** `refreshToken`

### `POST /api/auth/refresh`
Exchanges the valid HTTP-only refresh cookie for a new access token.
- **Request Headers:** Cookie `refreshToken=<token>`
- **Response `200`:** `{ "accessToken": "..." }`

### `POST /api/auth/logout`
Revokes active session tokens.
- **Request Headers:** Cookie `refreshToken=<token>`
- **Response `200`:** `{ "message": "Logged out successfully" }`
- **Cookies Cleared:** `refreshToken`

---

**Evidence:** `backend/controllers/authController.js`, `frontend/src/lib/api.js`, `backend/middleware/authMiddleware.js`, `docs/records/decisions/0003-use-web-locks-mutex-for-single-flight-jwt-renewal.md`.
