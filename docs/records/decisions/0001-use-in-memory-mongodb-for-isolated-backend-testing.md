---
title: "ADR 0001: Use In-Memory MongoDB for Isolated Backend Testing"
description: "Hermetic backend test execution using MongoMemoryServer binary instances"
quadrant: record
owner: "@medassist-team"
status: accepted
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
---

# ADR 0001: Use In-Memory MongoDB for Isolated Backend Testing

**Status:** Accepted  
**Date:** 2026-11-08  
**Deciders:** Backend Lead, Staff Architect, QA Lead  
**Technical Quadrant:** Record  

---

## Context

The backend integration and unit test suite evaluates authentication, user registration, encrypted provider credentials, session management, and chat persistence across MongoDB collections (`users`, `chats`, `generations`, `providercredentials`).

Relying on an external or containerized MongoDB instance introduces severe drawbacks:
1. **Network Flakiness**: Shared database instances or Docker daemon latency can cause intermittent connection timeouts.
2. **State Pollution**: Tests running sequentially or concurrently risk collisions if collections are not purged flawlessly.
3. **Developer Friction**: Developers running tests locally would require a running Docker daemon or local `mongod` service, complicating CI/CD runners and local contributor setups.

## Decision

We use `MongoMemoryServer` from `mongodb-memory-server` (pinned to MongoDB binary version `7.0.24`) within the Node.js test harness (`node:test` and `supertest`).

Key implementation details:
- In `backend/test/application.test.js`, the `before()` hook instantiates an in-memory binary instance:
  ```javascript
  database = await MongoMemoryServer.create({
    binary: { version: "7.0.24" },
    instance: { launchTimeout: 30000 },
  });
  await mongoose.connect(database.getUri());
  await Promise.all([User.init(), Chat.init(), Generation.init(), ProviderCredential.init()]);
  ```
- Indexes are initialized explicitly using `init()` to guarantee uniqueness constraints (such as `inputHash` and `exchangeId`) are tested.
- The `after()` hook terminates WebSocket clients, closes the HTTP server, disconnects Mongoose, and stops the memory server instance cleanly:
  ```javascript
  await mongoose.disconnect();
  await database?.stop();
  ```

## Consequences

### Positive
- **100% Hermetic Tests**: Every test suite execution runs in a pristine, ephemeral database environment with zero state persistence across runs.
- **Zero External Dependencies**: CI workflows and developer machines only require Node.js runtime without needing Docker or a managed MongoDB cluster.
- **Realistic Engine Behavior**: Unlike in-memory mocks, `MongoMemoryServer` runs real MongoDB binary semantics, verifying real BSON document limits, compound indexes, aggregation pipelines, and atomic `$push` / `$setOnInsert` operations.

### Negative
- Initial binary download on first test run requires network bandwidth (cached thereafter).
- Memory footprint is slightly higher during test execution than mock objects (~100-200 MB for the binary).

### Neutral
- MongoDB binary version in `application.test.js` is pinned to `7.0.24` to ensure reproducibility across environments.

## Alternatives Considered

- **Mocking Mongoose (e.g., `mockingoose`)**: Rejected because mocks do not validate real index constraints, atomic upserts, transaction boundaries, or MongoDB expression queries (`$expr`, `$bsonSize`).
- **Shared Docker Container (`docker-compose up -d mongo`)**: Rejected because tests would depend on Docker availability and require complex database cleanup scripts between runs to prevent cross-test contamination.

---

**Evidence:** `backend/test/application.test.js` (lines 8, 31-37), `backend/package.json` (`mongodb-memory-server`), `npm test --prefix backend`.
