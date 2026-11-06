# Current Capabilities and Release Gates

**Status date:** 6 November 2026
**Authority:** This is the current operational source of truth. Historical architecture guides are explanatory material and must not be used as evidence that an unimplemented integration, compliance program, or clinical validation exists.

## What the application does

- Provides an educational chat experience with account authentication, history, account export/deletion, optional personal model-provider keys, and a local-only untrusted conversation preview.
- Sends general questions to the selected configured provider. It retrieves up to three PubMed records/available abstracts for medical questions, then can generate an answer constrained to those abstracts.
- Checks whether numeric citations point to the supplied source-number range. This is a **format/range check**, not proof that a claim is entailed by a source or that an answer is clinically correct.
- Supplies deterministic first-line emergency, self-harm, harmful-instruction, prompt-injection, and limited name-pair medication-interaction responses. These are heuristic safeguards, not clinical triage or medication reconciliation.
- Provides 22 educational calculators. They are not validated for patient care and must not be used to diagnose, prescribe, triage, or make treatment decisions.
- PERC, HEART, qSOFA, and Modified Centor now require explicit findings before showing a point count or generating a prompt. Their completed views avoid individual rule-out and treatment conclusions. Other calculator defaults and risk wording still need clinical review; see `QA_2026-11-06.md`.

## Data handling controls now in code

- A newly registered account must accept the data-processing notice. Older and OAuth-created accounts must accept it in Account before a question can be sent to PubMed or an AI provider.
- Before external requests, the server redacts obvious email addresses, phone numbers, selected record/identity labels, and common identifier patterns. This is limited minimization—not complete de-identification. Users must not enter names, addresses, medical-record information, or other identifying information.
- Chat content remains in the application database until deletion or an operator retention policy. External-provider retention, data residency, contractual terms, and incident-response obligations are deployment/operator responsibilities.
- Personal provider API keys use AES-256-GCM. A named key ring supports lazy migration during rotation: keep the old `legacy` key available while setting `USER_API_KEY_ENCRYPTION_KEYS` and `USER_API_KEY_ENCRYPTION_KEY_VERSION` for the new active key.

## Do not claim

- HIPAA, GDPR, medical-device, or clinical-decision-support compliance.
- Clinical validation, diagnosis, treatment recommendations, medication reconciliation, or emergency care.
- Citation entailment, peer review, evidence quality, or medical correctness based solely on PubMed indexing or numeric citation checks.
- That backups, TLS termination, monitoring, alerting, disaster recovery, data residency, or a legal data-processing agreement are configured merely because example documentation exists.

## Required release gates

| Gate | Required evidence | Owner | Status |
|---|---|---|---|
| Privacy and legal | Privacy notice, consent wording, retention/deletion policy, data-processing agreements, provider data-use/residency review | Product/legal | Open |
| Security | TLS/HSTS at ingress, managed secrets, vulnerability/SAST review, access controls, incident runbook | Security/operations | Open |
| Reliability | Encrypted backups, automated schedule, documented retention, successful isolated restore drill, monitoring and alerts | Operations | Open |
| Clinical safety | Clinician-approved calculator/DDI inventory, intended populations/exclusions, safety evaluation and escalation design | Clinical owner | Open |
| Evidence quality | Retrieval policy, curated evaluation set, claim-to-source assessment, failure thresholds, change-control process | Clinical/ML owner | Open |
| Dataset/model | Source rights and provenance, permitted-use review, de-identification evidence where relevant, model card, red-team and holdout evaluation | Data/ML owner | Open |
| Scale | Shared rate limiter, provider budgets/circuit breakers, load test, capacity and recovery plan | Engineering/operations | Open |

No code change can close these gates without the listed external evidence and accountable owner sign-off.
