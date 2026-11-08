---
title: "How to Run Test Suites and Verification Checks"
description: "Step-by-step procedures to run backend integration tests, frontend unit tests, Python dataset checks, and the full multi-tier verification suite."
quadrant: how-to
audience: [developer, contributor]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["backend/test/", "frontend/src/test/", "Model and Dataset/", "scripts/verify_project.cjs"]
---

# How to Run Test Suites and Verification Checks

Use this guide to execute tests across the MedAssist AI repository, debug failing checks, and confirm compliance with project invariants before submitting pull requests.

---

## Before You Begin

Ensure dependencies are installed across both Node.js packages:

```bash
npm ci --prefix backend
npm ci --prefix frontend
```

---

## 1. Run Backend Integration Tests

The backend test suite runs natively with Node.js test runner against an in-memory MongoDB server instance (`MongoMemoryServer`). It executes 77 integration checks covering authentication, session rotation, DDI screening, rate limiting, and chat generation.

```bash
npm test --prefix backend
```

Expected result:
```text
# tests 77
# suites 0
# pass 77
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 6420
```

To run a specific test file:
```bash
node --test backend/test/interactionService.test.js
node --test backend/test/application.test.js
node --test backend/test/providerCredentials.test.js
```

---

## 2. Run Frontend Unit and Component Tests

Frontend tests use Vitest 3 to validate clinical risk calculation logic, complete-record gating, unassessed default states, Web Locks token renewal, and React component rendering across 61 tests.

```bash
npm test --prefix frontend
```

To run in watch mode during development:
```bash
npm run test:watch --prefix frontend
```

To run only the clinical calculator test suite:
```bash
npx vitest run src/test/clinicalCalculators.test.jsx --prefix frontend
```

---

## 3. Run Frontend Linter

ESLint verifies React 19 compliance, hook dependencies, and formatting standards:

```bash
npm run lint --prefix frontend
```

Expected result: Zero errors and zero warnings.

---

## 4. Run Python Dataset and LoRA Adapter Tests

The machine learning and dataset audit test suite validates dataset integrity, tokenization statistics, and LoRA training pipeline dry-runs across 19 tests:

```bash
python -m unittest discover -s "Model and Dataset"
python -m unittest discover -s "Model and Dataset/lora"
```

Expected result:
```text
Ran 19 tests in 0.052s

OK
```

---

## 5. Run Baseline Documentation Preservation Guard

MedAssist AI enforces Rule R1: zero deletions of baseline documentation files. Run the preservation guard:

```bash
node scripts/docs/check-no-deletions.cjs
```

In strict mode (fails if lines are deleted from baseline documentation files):
```bash
DOCS_STRICT_LINES=1 node scripts/docs/check-no-deletions.cjs
```

---

## 6. Run Documentation Coverage and Freshness Checks

Verify that all environment variables and documentation links are intact:

```bash
# Verify all environment variables from .env.example are documented
node scripts/docs/check-config-coverage.cjs

# Verify all relative and file markdown links are resolvable
node scripts/docs/doc-freshness.cjs

# Verify Diataxis front matter schema across all new documentation files
python scripts/docs/doc-freshness.py
```

---

## 7. Run the Full Multi-Tier Project Verification Suite

Execute all 12 validation stages (228 automated checks) in sequence:

```bash
node scripts/verify_project.cjs
```

Expected output:
```text
PASS docs-preservation
PASS docs-coverage
PASS docs-freshness
PASS backend
PASS frontend-lint
PASS frontend-tests
PASS frontend-build
PASS dataset-tests
PASS lora-tests
PASS lora-dry-run
PASS backend-production-audit
PASS frontend-production-audit
```

---

## Troubleshooting Failing Tests

| Symptom | Probable Cause | Action |
|:---|:---|:---|
| `MongoMemoryServer` download fails | Network proxy or firewall blocking binary download | Set `MONGOMS_DOWNLOAD_URL` or run in an environment with outbound HTTPS access. |
| `EADDRINUSE: port 5000` | Stale Node server process running | Terminate existing Node instances on port 5000. |
| `LINES REMOVED: ...` | Baseline documentation was modified with deleted lines | Revert line deletions using `git checkout docs/_meta/baseline-sha.txt -- <file>`. |
| Unassessed calculator failure | Default option in calculator modal initialized to `0` instead of `""` | Ensure state hooks default to empty string or null. |

---

**Evidence:** `backend/package.json`, `frontend/package.json`, `scripts/verify_project.cjs`, `scripts/docs/check-no-deletions.cjs`.
