---
title: "Tutorial: Getting Started with MedAssist AI"
description: "Step-by-step developer onboarding tutorial to install dependencies, run test suites, and launch the platform in 15 minutes"
quadrant: tutorial
audience: [developer, contributor]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["package.json", "backend/package.json", "frontend/package.json", "scripts/verify_project.cjs"]
---

# Tutorial: Getting Started with MedAssist AI

What you will build: A fully verified local installation of MedAssist AI with backend, frontend, clinical calculators, and test suites running locally in **15 minutes or fewer**.

---

## Before You Start

Ensure your workstation meets these minimum requirements:
- **Node.js:** v20.x or v24.x LTS (`node -v`)
- **npm:** v10.x or newer (`npm -v`)
- **Python:** v3.10 or newer (`python --version`)
- **Git:** v2.30 or newer (`git --version`)

---

## Step 1: Clone the Repository

Open your terminal and clone the repository:

```bash
git clone https://github.com/example/React-App-LLM.git
cd React-App-LLM
```

---

## Step 2: Install Dependencies

Install the backend and frontend package dependencies:

```bash
# Install backend dependencies
npm ci --prefix backend

# Install frontend dependencies
npm ci --prefix frontend
```

---

## Step 3: Run the Integration Test Suite

Verify that your local environment satisfies all clinical, cryptographic, and backend invariants:

```bash
# Run backend integration tests (77 tests in isolated in-memory MongoDB)
npm test --prefix backend
```

Expected output:
```text
ℹ tests 77
ℹ pass 77
ℹ fail 0
```

---

## Step 4: Run Frontend Unit Tests & Linter

Verify the 22 clinical calculators, Web Locks token renewal mutex, and React UI components:

```bash
# Run Vitest unit tests (61 tests)
npm test --prefix frontend

# Run ESLint check (0 errors, 0 warnings)
npm run lint --prefix frontend
```

---

## Step 5: Build the Production Frontend Bundle

Compile the React 19 single-page application with Vite 6:

```bash
npm run build --prefix frontend
```

Expected output:
```text
✓ built in 3.0s
dist/index.html
dist/assets/index-...js
```

---

## Step 6: Execute the Full Verification Suite

Run the multi-tier automated verification pipeline:

```bash
node scripts/verify_project.cjs
```

All 12 stages will report `PASS`, confirming 228 automated checks green.

---

## Troubleshooting Guide

| Symptom | Typical Cause | Resolution |
|:---|:---|:---|
| `MongoMemoryServer` launch timeout | High system load on first binary download | Increase `launchTimeout` or rerun command; binary is cached after first run. |
| `EADDRINUSE` port 5000 | Existing process running on port 5000 | Stop competing process or set `PORT=5001` in `backend/.env`. |
| ESLint missing parser warning | Dependency mismatch | Ensure clean install using `npm ci --prefix frontend`. |

---

## What You Built

You verified a complete full-stack clinical intelligence environment, including hermetic in-memory database testing, 22 validated clinical calculators, and deterministic drug interaction screening.

---

**Evidence:** `package.json`, `backend/package.json`, `frontend/package.json`, `scripts/verify_project.cjs`, `docs/_meta/verification-log.md`.
