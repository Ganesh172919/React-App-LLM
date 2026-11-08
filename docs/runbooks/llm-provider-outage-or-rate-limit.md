---
title: "Runbook: LLM Provider Outage or Rate Limit (HTTP 429 / 503)"
description: "Mitigation and failover procedures when upstream AI providers rate-limit or fail"
quadrant: runbook
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
---

# Runbook: LLM Provider Outage or Rate Limit (HTTP 429 / 503)

**Status:** Stable  
**Severity:** SEV-2 / SEV-3  
**Audience:** On-Call Engineers, AI Engineers, Operations  
**Technical Quadrant:** Runbook  

---

## 1. Alert Summary

- **Trigger:** Upstream AI API requests fail with HTTP 429 (Rate Limit / Quota Exceeded) or HTTP 500/503 (Provider Service Outage) for Google Gemini, Groq, or Together AI.
- **Impact:** Chat message generation fails with error message: `"Answer generation is unavailable. Please try again later."` (`AI_UNAVAILABLE`).
- **Service Affected:** `backend/services/modelProvider.js`, `backend/services/aiService.js`.

---

## 2. Immediate Diagnostic Steps

### Step 2.1: Check Provider Error Signatures
Inspect backend container logs for upstream provider error responses:
```bash
docker logs --tail 100 medassist-backend | grep -E "AI_UNAVAILABLE|rate limit|quota|ResourceExhausted"
```
Key signatures:
- `GoogleGenerativeAIError: [429 Too Many Requests] Resource has been exhausted`: Gemini API quota limit reached.
- `ECONNRESET` or `ETIMEDOUT` to `generativelanguage.googleapis.com`: Network connectivity issue or Google Cloud regional outage.
- `Together AI 429 Rate Limit`: Together inference quota exhausted.

### Step 2.2: Test Provider Directly from Bastion
Run a direct curl test using the deployment API key to verify whether the outage is provider-wide:
```bash
# Test Gemini API key directly
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"ping"}]}]}' | jq .
```
- If this returns `{ "candidates": [...] }`, the key is functional; check backend rate limiters or connection limits.
- If this returns an error response, the API key or provider is degraded.

---

## 3. Mitigation & Failover Procedures

### Option A: Switch System Default Provider via Environment Variable
If primary Gemini API is exhausted, failover to Groq or Together AI:
1. Update `.env` or container environment:
   ```bash
   # Switch from gemini to groq
   AI_PROVIDER=groq
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=openai/gpt-oss-20b
   ```
2. Reload backend service:
   ```bash
   docker compose restart backend
   ```
3. Verify new provider answers successfully:
   ```bash
   docker logs --tail 20 medassist-backend | grep "AI provider"
   ```

### Option B: Rotate Gemini API Key / Tier Up Quota
If on Google AI Studio free tier:
1. Generate a new API key in Google Cloud Console / AI Studio with billing enabled.
2. Update `GEMINI_API_KEY` in deployment environment.
3. Restart backend container:
   ```bash
   docker compose restart backend
   ```

### Option C: Advise Users to Supply Personal Provider Keys (BYOK)
MedAssist supports Bring-Your-Own-Key (BYOK) via `frontend/src/components/dashboard/ProviderSettingsModal.jsx`:
- Users can input their own Google Gemini or Groq API keys under **Account Settings > AI Providers**.
- Personal keys are encrypted with AES-256-GCM and bypass deployment rate limits completely.

---

## 4. Post-Incident Verification

1. Verify generation completes cleanly across test accounts.
2. Ensure citation grounding and PubMed retrieval continue to function.
3. Check `Generation` collection state in MongoDB to ensure pending jobs are cleared.

---

**Evidence:** `backend/services/modelProvider.js`, `backend/services/providerSelection.js`, `backend/services/aiService.js`, `backend/test/modelProvider.test.js`.
