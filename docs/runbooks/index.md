---
title: "Operational Runbooks Directory"
description: "On-call triage matrix, incident severity levels, and operational runbook catalog"
quadrant: runbook
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
---

# Operational Runbooks Directory

**Status:** Stable  
**Audience:** On-Call Engineers, Site Reliability Engineers (SRE), Operations Leads  
**Technical Quadrant:** Runbook  

---

## 1. On-Call Incident Severity Matrix

| Severity | Definition | Target Response SLA | Target Resolution SLA | Escalation Path |
|:---:|:---|:---:|:---:|:---|
| **SEV-1** | Total system outage, catastrophic database failure, or security breach (compromised keys/PII leak). | < 15 minutes | < 2 hours | Page Primary On-Call, Staff Architect, Security Lead. |
| **SEV-2** | Critical feature down (AI generation failing completely, authentication broken), 5xx error rate > 5%. | < 30 minutes | < 4 hours | Page Primary On-Call, Backend Lead. |
| **SEV-3** | Degraded performance (single provider rate-limited falling back to secondary, high latency > 5s), 5xx error rate 1-5%. | < 2 hours | < 1 business day | Notify On-Call Slack channel (`#medassist-alerts`). |
| **SEV-4** | Minor bugs, cosmetic UI issues, single calculator edge cases with no patient impact. | Next business day | Next sprint release | Open Jira/GitHub issue with reproduction steps. |

---

## 2. Runbook Catalog

| Runbook File | Alert Trigger / Scenario | Severity | Primary Service |
|:---|:---|:---:|:---|
| [High API Error Rate](api-error-rate-high.md) | High 5xx HTTP error rate on `/api/*` routes | SEV-2 | `medassist-backend` (Node.js) |
| [Database Connection Saturation](db-connection-saturation.md) | MongoDB connection pool exhausted or replica failover | SEV-1 / SEV-2 | `medassist-mongo` (MongoDB) |
| [LLM Provider Outage or Rate Limit](llm-provider-outage-or-rate-limit.md) | Upstream AI HTTP 429 (Rate Limit) or 503 (Outage) | SEV-2 / SEV-3 | `backend/services/answerService.js` |
| [Drug Interaction Screener Alert](drug-interaction-screener-alert.md) | Severe DDI warning spike or false positive dispute | SEV-3 / SEV-4 | `backend/services/interactionService.js` |

---

## 3. General Incident Response Checklist

1. **Acknowledge the Alert**: Claim the incident in your alerting tool (PagerDuty / Opsgenie / Slack).
2. **Assess Blast Radius**: Check `/api/health` and `/api/ready` to distinguish full platform outage from partial upstream degradation.
3. **Capture Telemetry**: Extract recent container logs and error dumps before restarting containers:
   ```bash
   docker logs --tail 200 medassist-backend > incident-backend.log
   docker logs --tail 200 medassist-mongo > incident-mongo.log
   ```
4. **Follow Specific Runbook**: Execute diagnosis and mitigation steps in the corresponding runbook below.
5. **Post-Incident Review**: File an incident postmortem within 48 hours for any SEV-1 or SEV-2 incident.

---

**Evidence:** `docs/DEPLOYMENT_RUNBOOK.md`, `backend/app.js`, `backend/server.js`.
