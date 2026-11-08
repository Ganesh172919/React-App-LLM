---
title: "How to Perform a Zero-Downtime Rollback and Disaster Recovery"
description: "Operational incident procedures for rolling back application containers, restoring MongoDB collections, and switching AI model providers during an outage."
quadrant: how-to
audience: [operator]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["docker-compose.yml", "deploy/backup-mongo.sh", "backend/services/providerSelection.js"]
---

# How to Perform a Zero-Downtime Rollback and Disaster Recovery

Use this guide when a deployment introduces regression errors, database corruption, or when upstream AI providers experience prolonged downtime.

---

## 1. Application Container Rollback

If a bad frontend build or backend bug passes CI and reaches production:

### Step 1.1: Identify Previous Stable Tag or Commit

```bash
git log --oneline -n 5
```

### Step 1.2: Check Out Stable SHA and Rebuild

```bash
# Check out the known good commit (e.g., v1.0.0 or commit SHA)
git checkout <PREVIOUS_STABLE_SHA>

# Rebuild and restart containers
docker compose build --no-cache
docker compose up -d --wait

# Confirm container health
docker compose ps
```

### Step 1.3: Verify System Health

```bash
curl --fail http://localhost:8080/api/health
curl --fail http://localhost:8080/api/ready
```

---

## 2. Database Backup & Disaster Restoration

MedAssist AI provides automated MongoDB database backup scripts located in `deploy/backup-mongo.sh`.

### Step 2.1: Create an On-Demand Backup Before Any Intervention

```bash
# Execute containerized mongodump archive
bash deploy/backup-mongo.sh
```

Backups are saved to `deploy/backups/medassist-<timestamp>.archive.gz`.

### Step 2.2: Restore from a Previous Archive

To restore the MongoDB database from a known good backup archive:

```bash
# Restore specific archive into running mongo container
docker compose exec -T mongo mongorestore \
  --username root \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --nsInclude="medassist.*" \
  --archive --gzip < deploy/backups/medassist-2026-11-08.archive.gz
```

Verify collection record counts after restoration:
```bash
docker compose exec -T mongo mongosh -u medassist_app -p "$MONGO_APP_PASSWORD" --authenticationDatabase medassist \
  --eval "db.users.countDocuments(); db.chats.countDocuments();" medassist
```

---

## 3. Instant AI Provider Failover

When an external provider (such as Google Gemini) suffers a regional outage or HTTP 429 quota exhaustion:

### Method A: Environment Variable Switch

Update `.env` to redirect all system traffic to an alternate configured provider:

```ini
# Change primary provider to Groq, Together, or Local
AI_PROVIDER=groq
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b
```

Restart the backend container without restarting MongoDB:

```bash
docker compose up -d --no-deps backend
```

Verify failover by inspecting logs:
```bash
docker compose logs --tail=50 backend | grep "AI_PROVIDER"
```

### Method B: User BYOK Fallback

Instruct users to navigate to **Account Settings > Model Credentials** to supply their own personal API key for Groq, Together AI, or a local OpenAI-compatible endpoint. User-provided keys are encrypted in the AES-256-GCM vault and bypass global system quotas.

---

**Evidence:** `docker-compose.yml`, `deploy/backup-mongo.sh`, `backend/services/providerSelection.js`.
