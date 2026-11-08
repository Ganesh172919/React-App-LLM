---
title: "Service Level Objectives (SLOs) & Error Budget Policy"
description: "Service level indicators, availability targets, error budget policies, and latency thresholds for MedAssist AI"
quadrant: reference
audience: [operator, architect]
owner: "@medassist-team"
status: proposed
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["backend/server.js", "backend/controllers/aiController.js", "docs/runbooks/"]
---

# Service Level Objectives (SLOs) & Error Budget Policy

This document defines the Service Level Indicators (SLIs), Service Level Objectives (SLOs), and Error Budget Policies for the MedAssist AI platform. All numerical targets are marked **Proposed** until finalized by operations leadership.

---

## 1. Service Level Indicators (SLIs) & Target SLOs

| Service Dimension | Indicator (SLI) | Proposed SLO Target | Measurement Window | Alert Trigger |
|:---|:---|:---:|:---:|:---|
| **API Availability** | Percentage of HTTP requests to `/api/*` returning non-5xx status codes. | **99.9%** (Proposed) | 30-day rolling | 5xx error rate > 5% over 5m window |
| **Health Probe Liveness** | Percentage of successful probes to `/api/health` and `/api/ready`. | **99.99%** (Proposed) | 30-day rolling | Readiness fails 3 consecutive checks |
| **Chat Generation Latency** | Time from `POST /api/ai/chat` ingress to complete response delivery. | **p95 < 12.0s**<br>**p50 < 4.0s** (Proposed) | 7-day rolling | p95 > 15.0s over 10m window |
| **DDI Safety Invariant** | Percentage of prompt/answer texts screened against 23 FDA Black Box rules. | **100.0%** (Mandatory) | Continuous | Any bypass of `detectDrugInteractions()` |
| **Calculator Record Gating**| Percentage of clinical calculator scores rendered with 100% assessed components. | **100.0%** (Mandatory) | Continuous | Any premature score render with unassessed inputs |

---

## 2. Error Budget Calculations

For a 30-day calendar period (43,200 minutes):

| SLO Target | Monthly Allowed Downtime / Error Budget |
|:---:|:---:|
| 99.9% (API Availability) | **43.2 minutes** |
| 99.99% (Core Health / Ingress) | **4.32 minutes** |

---

## 3. Error Budget Policy

When the monthly error budget consumption exceeds established thresholds:
- **< 50% Budget Consumed:** Standard development velocity; normal feature deployments.
- **50% - 80% Budget Consumed:** Production deployments require tech lead review; investigate failing components.
- **> 80% Budget Consumed:** Feature freeze; all engineering effort diverted to reliability, upstream failover, and bug resolution until the error budget recovers.

---

**Evidence:** `backend/server.js`, `backend/controllers/aiController.js`, `backend/services/interactionService.js`, `docs/runbooks/index.md`.
