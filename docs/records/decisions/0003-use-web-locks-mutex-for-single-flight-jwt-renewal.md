---
title: "ADR 0003: Use Web Locks Mutex for Single-Flight JWT Renewal"
description: "Serializing browser token refresh requests across tabs using the Web Locks API"
quadrant: record
owner: "@medassist-team"
status: accepted
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
---

# ADR 0003: Use Web Locks Mutex for Single-Flight JWT Renewal

**Status:** Accepted  
**Date:** 2026-11-08  
**Deciders:** Frontend Architect, Security Reviewer, Backend Lead  
**Technical Quadrant:** Record  

---

## Context

MedAssist uses short-lived JWT access tokens stored in memory/cookies with rotating refresh tokens stored in HTTP-only cookies (`/api/auth/refresh-token`). When an access token expires:
1. Multiple concurrent HTTP requests (e.g., chat history fetch, user settings load, model status check, websocket handshake) may simultaneously receive HTTP 401 Unauthorized responses.
2. If every failed request independently invokes `/api/auth/refresh-token`, a race condition occurs:
   - The first request consumes and rotates the refresh token.
   - Subsequent concurrent requests submit an already-invalidated refresh token.
   - The backend detects reuse of an invalidated refresh token and revokes the user's entire session, logging out the user unexpectedly.
3. In multi-tab scenarios, two browser tabs could refresh tokens concurrently, triggering the same race condition across tabs.

## Decision

We implement a single-flight token renewal mutex using the Web Locks API (`navigator.locks.request`) with an in-flight JavaScript promise cache in `frontend/src/lib/api.js`.

Implementation architecture:
1. **Mutex Lock Acquisition**:
   When `refreshSession()` is called, it checks if `refreshPromise` already exists. If not, it requests an exclusive lock named `"medassist-session-refresh"`:
   ```javascript
   export async function refreshSession() {
     if (!refreshPromise) {
       const refresh = () => request("/auth/refresh-token", { method: "POST" });
       refreshPromise = (navigator.locks
         ? navigator.locks.request("medassist-session-refresh", refresh)
         : refresh()
       )
         .then((data) => {
           window.dispatchEvent(new Event("session-renewed"));
           return data;
         })
         .catch((error) => {
           window.dispatchEvent(new Event("session-ended"));
           throw error;
         })
         .finally(() => {
           refreshPromise = null;
         });
     }
     return refreshPromise;
   }
   ```
2. **Transparent Interceptor Retry**:
   In `apiRequest()`, if a request encounters HTTP 401 and is not an authentication endpoint, it calls `await refreshSession()` and retries the original request once:
   ```javascript
   export async function apiRequest(path, options = {}) {
     try {
       return await request(path, options);
     } catch (error) {
       if (error.status === 401 && (!path.startsWith("/auth/") || path === "/auth/check")) {
         await refreshSession();
         return request(path, options);
       }
       throw error;
     }
   }
   ```
3. **Cross-Tab & Cross-Request Coordination**:
   - Within the same tab, `refreshPromise` ensures all simultaneous 401s attach to the single in-flight fetch.
   - Across different browser tabs of the same origin, `navigator.locks` serializes the refresh call so only one tab calls the rotation endpoint while other tabs queue until the lock is released.

## Consequences

### Positive
- **Eliminates Refresh Token Invalidation Storms**: Prevents race conditions and unintended user logouts when access tokens expire during bursts of network activity.
- **Cross-Tab Synchronization**: Works across multiple browser tabs without requiring complex manual `BroadcastChannel` or `localStorage` locking mechanisms.
- **Graceful Fallback**: If `navigator.locks` is unsupported (e.g. in older browser engines), gracefully degrades to the in-memory `refreshPromise` singleton.

### Negative
- Requests in secondary tabs wait for the primary tab to complete the lock execution (~100-200ms network round-trip).

### Neutral
- Emits standard DOM custom events (`session-renewed`, `session-ended`) for decoupled UI state updates.

## Alternatives Considered

- **`localStorage` Timestamp Lock**: Rejected due to edge cases with crashed browser tabs leaving orphan locks and lack of native async unlock semantics.
- **Shared Worker**: Rejected because it adds significant bundle complexity and is unnecessary given native Web Locks API availability in all modern browsers.

---

**Evidence:** `frontend/src/lib/api.js` (lines 13-32), `frontend/src/lib/README.md`, `frontend/src/test/api.test.js`.
