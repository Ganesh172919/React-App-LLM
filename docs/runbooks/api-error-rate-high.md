---
title: "Runbook: High API Error Rate (HTTP 5xx Spikes)"
description: "Diagnosis and recovery steps when backend HTTP 5xx error rate exceeds threshold"
quadrant: runbook
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
---

# Runbook: High API Error Rate (HTTP 5xx Spikes)

**Status:** Stable  
**Severity:** SEV-2  
**Audience:** On-Call Engineers, Backend Developers  
**Technical Quadrant:** Runbook  

---

## 1. Alert Summary

- **Trigger:** Alert fires when the percentage of HTTP 5xx responses on the Express backend exceeds 5% of total requests over a 5-minute rolling window.
- **Impact:** Users encounter error toasts ("Answer generation is unavailable", "Server error"), failed logins, or unable to load chat history.
- **Service Affected:** `medassist-backend` (Node.js Express API on port 5000).

---

## 2. Immediate Diagnostic Steps

### Step 2.1: Verify Health and Readiness Endpoints
Run these probes from the bastion or host:
```bash
# Check liveness (should return 200 { status: "ok" })
curl -i http://localhost:8080/api/health

# Check readiness (verifies MongoDB connection state)
curl -i http://localhost:8080/api/ready
```
- If `/api/health` fails or times out: The Node.js event loop is completely blocked or the process crashed.
- If `/api/ready` returns HTTP 503: The database connection is disconnected (`readyState !== 1`). Switch immediately to [Database Connection Saturation Runbook](db-connection-saturation.md).

### Step 2.2: Inspect Backend Container Logs
Search for uncaught exceptions, unhandled promise rejections, or database connection drops:
```bash
docker logs --tail 100 medassist-backend | grep -E "ERROR|Unhandled|Exception|AI_UNAVAILABLE"
```
Filter for specific error codes:
- `AI_UNAVAILABLE`: Upstream AI provider is failing or rate-limiting. Switch to [LLM Provider Outage Runbook](llm-provider-outage-or-rate-limit.md).
- `ECONNREFUSED`: Node.js cannot reach MongoDB on `mongo:27017`.
- `BSONSizeExceeded`: Conversation document exceeds MongoDB 16MB limit.

---

## 3. Mitigation & Recovery Procedures

### Scenario A: Node.js Process Crash / High Memory Saturation
If memory usage is exceeding limits (> 1.8 GB for Node.js process):
```bash
# Check container stats
docker stats medassist-backend --no-stream

# Perform graceful restart
docker restart medassist-backend
```
Confirm the container reports healthy within 15 seconds:
```bash
curl -i http://localhost:8080/api/health
```

### Scenario B: Massive Traffic Spike / Slowloris Attack
If requests are queuing and timing out at 35 seconds:
1. Verify ingress rate limiters in `deploy/nginx/conf.d/default.conf`.
2. Inspect active connections:
   ```bash
   netstat -an | grep 8080 | wc -l
   ```
3. Temporarily tighten IP rate limiters or enable Cloudflare Under Attack mode.

---

## 4. Post-Incident Verification

1. Verify error rate returns to < 0.1% in dashboard telemetry.
2. Confirm chat generation completes successfully:
   ```bash
   curl -s -X POST http://localhost:8080/api/health
   ```
3. Check for any stuck `Generation` documents in MongoDB with state `"pending"`.

---

**Evidence:** `backend/app.js` (error handling middleware), `backend/routes/aiRoute.js`, `backend/test/application.test.js`.
