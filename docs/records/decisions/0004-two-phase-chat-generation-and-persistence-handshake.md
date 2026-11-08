---
title: "ADR 0004: Two-Phase Chat Generation and Persistence Handshake"
description: "Decoupling AI inference from database persistence with idempotent exchange matching"
quadrant: record
owner: "@medassist-team"
status: accepted
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
---

# ADR 0004: Two-Phase Chat Generation and Persistence Handshake

**Status:** Accepted  
**Date:** 2026-11-08  
**Deciders:** Backend Lead, Full-stack Architect, Database Administrator  
**Technical Quadrant:** Record  

---

## Context

In an AI chat application, message generation involves expensive and slow upstream LLM provider API calls (2-15 seconds), while message persistence involves database mutations in MongoDB.

Combining generation and persistence into a single monolithic API call creates several failure modes:
1. **Network Disconnects during Generation**: If a user's mobile client drops connection while the LLM is responding, a monolithic handler either discards the response (wasting compute/API cost) or saves it without the client ever knowing its ID.
2. **Double-Spend on Retries**: When users click "Send" multiple times or network latency causes HTTP retries, a monolithic endpoint could trigger duplicate expensive LLM calls.
3. **Document Size Bloat**: Persisting raw streams or unchecked message arrays risks exceeding MongoDB's strict 16MB document size limit (`BSONSizeExceeded`).

## Decision

We split message handling into a robust two-phase handshake:
1. **Phase 1: Generation (`POST /api/ai/chat`)**:
   - The client generates a unique `exchangeId` (UUID v4) and sends `{ prompt, sessionId, exchangeId }`.
   - The backend hashes the prompt, session, and medical flag (`inputHash = sha256(...)`).
   - The backend atomically creates a record in the `Generation` collection:
     ```javascript
     job = await Generation.create({
       userId: req.user.id,
       exchangeId,
       inputHash,
       sessionId: requestedSession || randomUUID(),
       newConversation: !requestedSession,
     });
     ```
   - If a duplicate `exchangeId` is sent, MongoDB unique indexing triggers error code 11000. If the existing job is `"ready"`, the backend returns the cached result immediately; if still generating, it responds with HTTP 409 `GENERATION_PENDING`.
   - The LLM processes the prompt via `answer()` with an `AbortController` timeout (35,000ms).
   - Upon completion, the result is saved to the `Generation` collection with state `"ready"`, and returned to the client alongside `generationId` and `sessionId`.
2. **Phase 2: Persistence Handshake (`POST /api/chat/save`)**:
   - The client receives the generated response and submits `{ generationId }` to commit the message to the conversation history.
   - The server verifies the `Generation` record exists, is owned by the authenticated user, has state `"ready"`, and has not expired (`expiresAt: { $gt: new Date() }`).
   - The message is appended to the `Chat` document using an atomic `$findOneAndUpdate` query with strict safety guards:
     ```javascript
     const chat = await Chat.findOneAndUpdate({
       sessionId: job.sessionId,
       userId: req.user.id,
       "messages.exchangeId": { $ne: job.exchangeId },
       $expr: {
         $and: [
           { $lt: [{ $size: "$messages" }, 1000] },
           { $lt: [{ $add: [{ $bsonSize: "$$ROOT" }, bytes] }, 12 * 1024 * 1024] },
         ],
       },
     }, {
       $push: { messages: message },
       $set: { updatedAt: new Date(), ...(result.isMedical ? { isMedical: true } : {}) },
     }, { new: true, runValidators: true }).lean();
     ```
   - If the exchange was already saved, it safely replays the conversation with `{ replayed: true }`.
   - A real-time update event (`SAVED`) is broadcast over WebSockets to synchronize connected clients across devices.

## Consequences

### Positive
- **Guaranteed Idempotency**: Identical `exchangeId` requests cannot invoke duplicate upstream LLM provider calls.
- **Fail-Safe Persistence**: Generation results are decoupled from network dropouts. If the client disconnects, the answer remains available in `Generation` for replay or retrieval.
- **Document Safety Invariants**: Strictly enforces a maximum of 1,000 messages and a maximum BSON size of 12MB (well below the 16MB MongoDB hard limit).
- **Separation of Concerns**: Generation handles prompt redaction, safety screening, citation fetching, and LLM inference; persistence handles conversation titles, pinning, history pagination, and WebSocket sync.

### Negative
- Client-side orchestration requires two sequential HTTP calls (`/api/ai/chat` followed by `/api/chat/save`).

### Neutral
- Temporary `Generation` records expire automatically using MongoDB TTL index.

## Alternatives Considered

- **Single Monolithic Route (`POST /api/chat/message`)**: Rejected because it cannot provide robust client-side retry idempotency without complex distributed state machines, and risks orphaned database writes during network drops.
- **Server-Side Background Job Queue (e.g. BullMQ / Redis)**: Evaluated, but rejected for current system scale to avoid adding external Redis infrastructure dependencies when MongoDB TTL and unique indexes suffice.

---

**Evidence:** `backend/controllers/aiController.js` (lines 7-42), `backend/controllers/chatController.js` (lines 15-40), `backend/models/generationModel.js`, `backend/models/chatModel.js`, `backend/test/application.test.js`.
