---
title: "Production readiness review: <release>"
description: "Go-live checklist and decision for <release>"
quadrant: record
audience: [operator, maintainer]
owner: "@<team>"
status: draft
last_reviewed: YYYY-MM-DD
review_every_days: 365
---

# Production readiness review: <release>

Decision: **Ready / Conditional / Not ready** | Reviewers: <names> | Date: YYYY-MM-DD

| Dimension | Pass criteria | Status (Pass / At risk / Fail) | Evidence and remediation |
|---|---|---|---|
| Reliability | SLIs and SLOs defined (availability, latency, error rate), none set to 100%; error budget policy agreed | | |
| Health | Readiness and liveness probes defined and tested | | |
| Observability | Metrics, logs with correlation IDs, traces; dashboards for SLIs; every alert links to a runbook | | |
| Capacity | Load profile and capacity plan; autoscaling or headroom documented | | |
| Data | Backups running, restore tested, retention defined, migrations reversible or rehearsed | | |
| Security | Threat model current, secrets managed and rotated, dependency and image scans clean, access reviewed | | |
| Deployment | CI/CD pipeline, rollback tested, feature flags, config per environment | | |
| On-call | Rotation, escalation paths, runbooks drilled | | |
| AI quality (if applicable) | Evaluation thresholds met, prompt and model versions pinned, guardrails tested, cost budget and alerts set | | |
| Documentation | Acceptance tests T1 to T7 pass | | |
