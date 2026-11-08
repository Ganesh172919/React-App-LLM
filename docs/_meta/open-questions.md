# Open Questions & Owner Confirmations

**Date:** 2026-11-08  
**Status:** Active  
**Rule R3 Mandate:** Only questions requiring human/institutional decisions are recorded here. Zero questions have been fabricated.

---

## 1. Clinical Safety & Medical Governance

1. **Independent Clinical Evaluation & Sign-Off**:
   - *Question*: Which clinical director or board-certified physician panel will review and sign off on calculator wording, exclusion criteria, and emergency triage thresholds before patient-facing pilot deployments?
   - *Page Affected*: `docs/CURRENT_CAPABILITIES_AND_RELEASE_GATES.md`, `docs/SECURITY_AND_MESSAGE_POLICY.md`
   - *Context*: Software tests verify formula fidelity and input gating, but software tests do not constitute clinical validation.

2. **Held-Out Clinical Evaluation Dataset**:
   - *Question*: What clinical reference corpus and evaluation benchmark will be established for measuring LLM grounding faithfulness and citation precision against clinical gold standards?
   - *Page Affected*: `docs/EVALUATION_AND_INTEGRATION.md`, `Model and Dataset/DATASET_CARD.md`

---

## 2. Security & Compliance Operations

1. **Security Vulnerability Reporting Channel**:
   - *Question*: What designated email address or GitHub security advisory channel should be published in `SECURITY.md` for private vulnerability disclosures?
   - *Page Affected*: `SECURITY.md`, `docs/SECURITY_AND_MESSAGE_POLICY.md`
   - *Proposed Default*: GitHub Private Vulnerability Reporting until a security team alias is configured.

2. **HIPAA / GDPR Business Associate Agreements (BAA)**:
   - *Question*: For production instances handling identifiable health information, which cloud model providers (e.g. Google Vertex AI, AWS Bedrock, or self-hosted air-gapped vLLM) have executed BAAs with the operating entity?
   - *Page Affected*: `docs/DEPLOYMENT_RUNBOOK.md`, `docs/ISSUES_AND_RISKS.md`
   - *Current State*: The platform defaults to source-only deflection or local anonymization when external consent is absent.

---

**Evidence:** `docs/QA_2026-11-07.md`, `docs/CURRENT_CAPABILITIES_AND_RELEASE_GATES.md`, `backend/services/safetyService.js`.
