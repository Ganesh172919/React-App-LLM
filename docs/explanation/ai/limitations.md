---
title: "System Limitations and Clinical Boundaries"
description: "Explicit boundary definitions between educational AI intelligence, statistical approximations, and certified medical devices in MedAssist AI."
quadrant: explanation
audience: [auditor, security, developer]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["docs/records/model-cards/system-card.md", "backend/services/interactionService.js", "frontend/src/components/tools/ClinicalCalculatorsModal.jsx"]
---

# System Limitations and Clinical Boundaries

MedAssist AI is designed as an educational assistant and biomedical research aid. This document details its structural boundaries, intended scope, and operational limits.

---

## 1. Regulatory Status & Educational Scope

- **Not Software as a Medical Device (SaMD):** MedAssist AI has not been evaluated, cleared, or approved by the United States Food and Drug Administration (FDA), European Medicines Agency (EMA), or any national health regulatory authority.
- **Educational Intent:** It is engineered to assist healthcare trainees, medical students, and biomedical researchers in understanding pathophysiological mechanisms, literature synthesis, and clinical calculation formulas.
- **No Direct Patient Care:** It must never be used as a primary diagnostic tool, autonomous triage agent, or closed-loop prescription engine.

---

## 2. Drug Interaction Screener Scope & Limits

While the deterministic DDI engine (`interactionService.js`) enforces 23 critical FDA Boxed Warning rules:
- **Not a Complete Formulary Engine:** It does not model all 50,000+ FDA-approved pharmaceuticals, OTC supplements, herbal compounds, or pharmacokinetic interactions (e.g., CYP2D6 slow metabolizers or phase II glucuronidation).
- **No Renal/Hepatic Dose Adjustment:** The screener does not calculate dynamic drug elimination clearances based on current GFR or Child-Pugh class.
- **Pure Name Matching:** The engine detects mentions in textual strings. It does not ingest electronic health record (EHR) medication administration records (MAR) or verify adherence.

---

## 3. Clinical Calculator Assumptions & Approximations

The 22 clinical scoring tools are mathematical models derived from clinical literature and carry inherent limitations:
- **MELD-Na Historical Formula:** Implements the 2016 OPTN/UNOS MELD-Na formula (capped at 40 points). It does not reflect OPTN MELD 3.0 updates incorporating sex adjustments and albumin variables.
- **eGFR (CKD-EPI 2021):** Implements the 2021 race-free serum creatinine equation. It assumes steady-state renal function and is invalid in acute kidney injury (AKI) where creatinine is dynamically fluctuating.
- **Pediatric Fluids:** Implements the Holliday-Segar 4-2-1 hourly fluid rule for baseline maintenance in non-dehydrated patients; it does not calculate deficit replacement or electrolyte balancing in diabetic ketoacidosis (DKA) or burn resuscitation.

---

## 4. PubMed Retrieval & AI Hallucination Safeguards

- **PubMed Keyword Latency:** Literature retrieval relies on NCBI E-Utilities HTTP endpoints subject to network latency and NCBI API rate limits.
- **Abstract-Only Grounding:** In default configuration, the retrieval engine ingests abstracts and metadata, not full-text PDF manuscripts.
- **Parametric Drift:** Despite system prompt constraints, generative language models may occasionally exhibit subtle phrasing drift or misinterpret ambiguous clinical queries. All model outputs must be corroborated with primary clinical sources.

---

**Evidence:** `docs/records/model-cards/system-card.md`, `backend/services/interactionService.js`, `frontend/src/components/tools/ClinicalCalculatorsModal.jsx`.
