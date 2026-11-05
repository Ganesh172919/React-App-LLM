# MedAssist AI — Codebase Audit

**Audit date:** 4 November 2026  
**Audit mode:** Initial read-only review, followed by repository-controlled remediation.  
**Release position:** Stronger educational-project foundation, but **not ready for clinical use or an unattended production launch** until the externally accountable release gates below are closed.

## Scope and verification

- Inventory read: **280 tracked files** (222 text files; 58 binary/data artifacts), about **30.0 MiB** total. This includes the backend, frontend, deployment files, test suites, dataset/LoRA tooling, reports, CI, and documentation. PDFs, images, and the 22.3 MiB CSV were inspected as data artifacts rather than interpreted as source code.
- Existing worktree changes were found in 11 user-owned files (including the calculator, chat workspace, interaction service, tests, README, and docs). They were not modified or reverted.
- Checks run successfully:
  - Backend: **75/75** Node tests passed.
  - Frontend: ESLint passed; **59/59** Vitest tests passed; Vite production build passed.
  - Dataset/LoRA tooling: **13/13** Python tests passed.
  - `npm audit --omit=dev --audit-level=high`: **0 known production dependency vulnerabilities** for both backend and frontend at audit time.
- Not executed in this audit: live third-party provider calls, email delivery, Docker Compose startup, real TLS ingress, backup restoration, and the complete Playwright browser suite. CI defines coverage for several of these, but that is not evidence of a completed deployment rehearsal.

Passing tests establish implementation consistency; they do **not** establish clinical correctness, privacy compliance, model safety, source quality, or operational readiness.

## What exists today

The repository already provides a meaningful feature set:

- Email-verified authentication, refresh-token rotation, Google OAuth with PKCE, account export/deletion, owner-scoped chats, and WebSocket chat updates.
- General and medical chat flows, selectable deployment/personal AI providers, encrypted-at-rest personal provider keys, and optional bounded prior-chat context.
- PubMed search/summary/abstract retrieval, references-only fallbacks, bracket-number citation-range checking, optional second-model review, deterministic emergency/self-harm/harmful-instruction filters, and a limited name-based high-risk drug-interaction rule set.
- 22 educational calculators, dark theme, responsive chat/history UI, local-only untrusted JSON preview, JSON/Markdown exports, analytics, Docker/CI scaffolding, and separate offline dataset/LoRA utilities.

Those are strong project capabilities. They should be described as **educational safeguards and evidence-assistance features**, never as diagnosis, clinical decision support, verified medical advice, or regulatory compliance.

## Priority findings

| Priority | Finding | Evidence and impact | Recommended resolution |
|---|---|---|---|
| P1 — release blocker | Privacy, legal, and provider-accountability evidence is incomplete. | The code now requires current data-processing consent, minimizes obvious identifiers before external calls, and persists the minimized prompt; it cannot establish complete PHI detection, provider retention/data-residency terms, or legal compliance. | Do not accept real clinical data until the privacy notice, retention policy, data-processing agreements, provider review, and legal/security approval are complete. |
| P1 — release blocker | “Grounded” answers are not clinically verified or entailment-verified. | [`citationService.js`](backend/services/citationService.js) validates only whether bracket numbers are in range. [`answerService.js`](backend/services/answerService.js) retrieves at most three keyword-based PubMed records/abstracts and explicitly persists `grounded: false`; optional review is another model answering `SUPPORTED` or `UNSUPPORTED`. Citation position/range validation does not prove that a claim is supported by the cited abstract. | Rename product claims to “source-linked” / “citation-number checked.” Add source-quality/ranking policy, claim-to-passage entailment evaluation, clinician-reviewed golden cases, failure metrics, and a human clinical-review release gate before elevating claims. |
| P1 — release blocker | Safety and triage are heuristic regex filters, not a clinical safety system. | [`safetyService.js`](backend/services/safetyService.js), [`interactionService.js`](backend/services/interactionService.js), and the calculator UI use bounded phrase/name matching. Coverage can miss paraphrases, language variants, medication spelling/route/dose/context, and symptoms outside the list; it can also flag benign context. The 22 calculators and 22 DDI rules are not clinically validated in this repository. | Keep the emergency instructions and disclaimers, but add a risk taxonomy, multilingual/adversarial evaluation corpus, expert review of every calculator/rule/version, provenance links, explicit limits beside every result, and escalation/contact design appropriate to the markets served. |
| P1 — release blocker | Production transport, recovery, and operations are not delivered by Compose. | The Nginx configuration now declares HSTS for a TLS ingress and a backup helper exists, but Compose still publishes HTTP and does not itself supply public TLS, scheduling, restore verification, monitoring/alerting, resource limits, or shared rate-limit storage. | Put TLS termination/HSTS, secret management, backup encryption/retention, restore drills, uptime/error/latency monitoring, alerting, quotas, resource limits, and horizontally safe rate limiting into actual deployed infrastructure. |
| P1 — release blocker for training | The offline dataset has material quality and provenance gaps. | The checked-in analysis reports 16,412 raw rows, 5 empty answers, 48 exact duplicates, 2,062 repeated question instances, and 1,437 divergent-question groups quarantined only when the preparation pipeline is run. The analysis explicitly recommends source-license/provenance fields, which are absent from the raw Q&A shape. The live app does not use a trained adapter. | Establish source licenses, provenance, permitted-use evidence, clinical-review criteria, de-identification evidence, and versioned dataset/model cards before training. Rebuild prepared splits deterministically in CI and evaluate against a clinician-approved holdout set; never treat the included CSV as production-ready training data by default. |
| Resolved in code | Account export claimed a creation date that the schema did not store. | `User` now uses Mongoose timestamps and exports `createdAt` (or `null` for historical records); the API test verifies it for new accounts. | Backfill historical records only if product/legal policy requires it. |
| P2 | Documentation materially diverges from the shipped code. | Examples: [`docs/COMPREHENSIVE_CODEBASE_ANALYSIS.md`](docs/COMPREHENSIVE_CODEBASE_ANALYSIS.md) describes Helmet middleware that is not installed or used; [`scripts/README.md`](scripts/README.md) says the build-serving check verifies CSP/HSTS, while [`check_build_serving.cjs`](scripts/check_build_serving.cjs) only asserts cache/no-sniff and routing; some docs present non-existent/import-incompatible sample APIs. Counts of calculators, interaction rules, and assertions vary among docs. | Create one source-of-truth capability matrix. Mark examples as examples, generate counts from code/tests where possible, add documentation-link/API drift checks in CI, and remove absolute `file:///` links. |
| P2 | The frontend carries unused legacy UI and an oversized monolith. | `Login.jsx`, `Register.jsx`, `header/Header.jsx`, `footer/Footer.jsx`, and four legacy auth view files are not imported by the active route tree, which uses [`AuthPage.jsx`](frontend/src/components/auth/AuthPage.jsx). [`ClinicalCalculatorsModal.jsx`](frontend/src/components/tools/ClinicalCalculatorsModal.jsx) is about 136 KiB / roughly 3,000 lines and is bundled into the initial application; the production JS bundle is 492 KiB (149 KiB gzip). | Delete or archive unreachable components after confirming no external consumers. Split calculator definitions/formulas into tested modules and lazy-load the modal; introduce route/component bundle budgets. |
| P2 | Scale and resilience limits are in-process. | Express rate limiting uses the default local store, so limits do not coordinate across replicas. [`analyticsController.js`](backend/controllers/analyticsController.js) recomputes lifetime aggregates across all owned chats/messages per request. WebSocket heartbeat/broadcast performs per-socket database checks. External AI/PubMed calls lack per-user cost budgets, circuit breakers, or durable jobs. | Use Redis or an equivalent shared limiter/session-event facility, pre-aggregate analytics, add connection/cost quotas and provider circuit breakers, and instrument provider latency/error/cost without logging sensitive prompt contents. |
| Resolved in code | Encrypted personal keys had no visible rotation/versioning lifecycle. | Records now carry a key version; named active/legacy key rings support lazy rotation on first successful use, with unit coverage. | Move production keys to managed KMS/HSM/envelope encryption and rehearse recovery before production use. |
| P2 | Test quality is good but release assurance remains incomplete. | Backend lint, Dependabot, CodeQL, static ingress-header checking, and built-app browser smoke coverage are now configured. Coverage thresholds, secret scanning, real infrastructure E2E, migration test, restore drill, load test, and clinical-evaluation gates remain absent. | Add the remaining checks incrementally, making deployment promotion contingent on the appropriate evidence rather than only code-unit success. |
| P3 | Repository hygiene is noisy. | About 6 MiB of committed `output/` QA screenshots/reports and duplicate architecture PDFs are checked in. Generated material makes reviews and cloning noisier, while `.gitignore` does not exclude `output/`. | Keep curated evidence in releases/artifacts or Git LFS as appropriate; ignore ephemeral QA output and retain a small, versioned test summary. |

## Remediation completed after the audit

- Added explicit versioned data-processing consent, account gating, obvious-identifier minimization before external calls, and minimized conversation persistence.
- Added account creation timestamps and export fields for new accounts.
- Added personal-key key-version metadata, active/legacy rotation support, configuration validation, and regression tests.
- Added backend linting, Dependabot, CodeQL, a backup helper, Nginx HSTS declaration/static verification, and explicit current-capability/release-gate documentation.
- Lazy-loaded the calculator modal, reducing the initial JavaScript bundle from about 149 KiB gzip to about 131 KiB gzip.
- Verified the backend suites, all frontend suites, production build, built-app serving checks, and 21 browser smoke workflows after the changes.

## Security assessment

### Strengths observed

- Strict owner-scoping is consistently used for chats, generated answers, analytics, and personal provider credentials.
- Access and refresh tokens are HTTP-only cookies, refresh tokens are stored as hashes, sessions are versioned, and refresh replay revokes the session.
- CORS/origin checks, JSON size limits, request IDs, API no-store headers, response hardening headers, provider endpoint constraints, request timeouts, and WebSocket payload/client limits are present.
- Personal provider credentials use authenticated AES-256-GCM encryption and are not returned in API responses.
- Conversation imports strip trust-bearing metadata and remain a local untrusted preview.
- Dependency audit reported no production vulnerabilities at this audit point.

### Remaining security work

No critical source-level exploit was identified in this review. The meaningful security release risk is the combination of sensitive free-text health data, third-party model egress, incomplete production controls, and claims that can outpace the evidence. Address the P1 privacy, deployment, audit/monitoring, and key-lifecycle gates before onboarding real users.

## Recommended delivery plan

### Phase 0 — make release claims accurate

1. Change public wording from “grounded/verified” to “source-linked” and “citation-number checked.”
2. Publish an explicit educational-use boundary, privacy notice, retention/deletion statement, provider data-flow diagram, and no-emergency-care notice.
3. Reconcile the README, runbooks, architecture docs, and current code; fix the missing account `createdAt` export contract.

### Phase 1 — establish a safe pilot

1. Implement consent/version logging, optional PII minimization, least-data provider routing, and no-content audit events.
2. Deploy actual TLS/HSTS, managed secrets, encrypted backups, restoration rehearsal, monitoring, alerts, and a shared rate-limit store.
3. Add per-user/provider request-cost quotas, circuit breakers, structured operational metrics, and incident-response ownership.
4. Obtain legal/privacy and clinical-review approval for the pilot scope and geography.

### Phase 2 — improve evidence and clinical quality

1. Replace naive three-result retrieval with a versioned evidence policy: query normalization, study-type/date filters, guideline preference where applicable, source metadata, and explicit “insufficient evidence” outcomes.
2. Build a clinician-authored evaluation set covering normal questions, emergency symptoms, medication combinations, pregnancy/pediatric cases, prompt injection, non-English phrasing, and calculator boundary values.
3. Version each calculator and DDI rule with authoritative references, review date, intended population, exclusions, and test vectors.
4. Require measured quality/safety thresholds and periodic review before changing providers, prompts, models, or medical logic.

### Phase 3 — engineering and product evolution

1. Decompose/lazy-load calculators; remove unused UI and stale patch scripts; adopt a typed request/schema boundary.
2. Add bundle size, coverage, SAST, secret scanning, dependency automation, Docker E2E, migration, restore, performance, and accessibility regression gates.
3. Add opt-in product capabilities only after the privacy/evidence base exists: multilingual support, accessible source summaries, saved source collections, clinician-review workflows, and organization-level roles/audit trails.
4. Keep LoRA work offline until dataset rights, review, evaluation, red-team testing, and model-serving safeguards are complete.

## Practical next actions

If the goal is a portfolio/demo project, the highest-value next move is **documentation cleanup plus calculator modularization**. If the goal is a real-user pilot, do **Phase 0 and Phase 1 first**. If the goal is a medical product, pause feature expansion and commission privacy, security, legal, clinical-safety, and dataset-provenance reviews before any patient-facing launch.

## Audit limitations

This is a source and local verification audit, not a penetration test, clinical validation, legal opinion, or live infrastructure assessment. The absence of a reported defect is not proof of safety or compliance.
