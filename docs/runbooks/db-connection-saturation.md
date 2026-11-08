---
title: "Runbook: MongoDB Connection Pool Saturation and Database Outage"
description: "Mitigation procedures for MongoDB connection pool exhaustion, slow queries, and failovers"
quadrant: runbook
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
---

# Runbook: MongoDB Connection Pool Saturation and Database Outage

**Status:** Stable  
**Severity:** SEV-1 / SEV-2  
**Audience:** On-Call Engineers, Database Administrators  
**Technical Quadrant:** Runbook  

---

## 1. Alert Summary

- **Trigger:** Alert fires when MongoDB connection pool utilization reaches > 90% or `/api/ready` returns HTTP 503 with `"database": "disconnected"`.
- **Impact:** Complete inability to authenticate users, save chat messages, store provider API keys, or update sessions.
- **Service Affected:** `medassist-mongo` (MongoDB 7.x) and `medassist-backend` (Mongoose connection pool).

---

## 2. Immediate Diagnostic Steps

### Step 2.1: Check API Readiness
```bash
curl -i http://localhost:8080/api/ready
```
Expected output when healthy:
```json
{
  "status": "ready",
  "database": "connected",
  "timestamp": "2026-11-08T12:00:00.000Z"
}
```
If `"database": "disconnected"`, check MongoDB container status:
```bash
docker ps -a --filter "name=medassist-mongo"
```

### Step 2.2: Inspect MongoDB Server Status
Execute `mongosh` inside the container or on host:
```bash
docker exec -it medassist-mongo mongosh --eval "db.serverStatus().connections"
```
Look at:
- `current`: Number of active inbound connections.
- `available`: Remaining available connection slots.
- `totalCreated`: Trend of new connection creation (if growing rapidly, indicates connection leak or insufficient pooling).

### Step 2.3: Check Disk Space and I/O Wait
```bash
docker exec -it medassist-mongo df -h /data/db
```
If disk space is > 95% full, MongoDB will lock the database to prevent journaling corruption.

---

## 3. Mitigation & Recovery Procedures

### Scenario A: MongoDB Process Down / OOM Killed
If container exited with status code 137 (OOM Killer):
1. Check host kernel messages:
   ```bash
   dmesg | grep -i oom
   ```
2. Restart the database container:
   ```bash
   docker start medassist-mongo
   ```
3. Wait 10 seconds and restart backend to re-establish Mongoose connection pool:
   ```bash
   docker restart medassist-backend
   ```
4. Verify `/api/ready` returns 200.

### Scenario B: High Connection Count / Connection Leak
If `current` connections is near `maxPoolSize`:
1. Check slow queries:
   ```bash
   docker exec -it medassist-mongo mongosh --eval "db.currentOp({ 'secs_running': { '\$gt': 5 } })"
   ```
2. Terminate long-running unindexed queries if necessary:
   ```bash
   docker exec -it medassist-mongo mongosh --eval "db.killOp(<opid>)"
   ```
3. Ensure compound indexes exist on `chats`:
   ```bash
   docker exec -it medassist-mongo mongosh --eval "db.chats.getIndexes()"
   ```

### Scenario C: Disk Full on `/data/db`
1. Prune expired `generations` records (should automatically expire via TTL index):
   ```bash
   docker exec -it medassist-mongo mongosh --eval "db.generations.deleteMany({ expiresAt: { \$lt: new Date() } })"
   ```
2. Rotate and compress old MongoDB diagnostic logs.
3. Allocate additional volume storage on the host.

---

## 4. Post-Incident Actions

1. Check that Mongoose reconnection events trigger cleanly in backend logs:
   `"Mongoose connected to MongoDB"`.
2. Verify all test collections and indexes are active.
3. Review whether `maxPoolSize` in Mongoose connection options requires tuning.

---

**Evidence:** `backend/server.js`, `backend/app.js` (readiness probe), `backend/models/chatModel.js`, `backend/models/generationModel.js`.
