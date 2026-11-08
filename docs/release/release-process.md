---
title: "Release Process and Quality Gates"
description: "Formal release procedure, Semantic Versioning standards, automated verification gates, and rollback readiness for MedAssist AI."
quadrant: policy
audience: [maintainer, operator, developer]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["package.json", "CHANGELOG.md", "scripts/verify_project.cjs", ".github/workflows/ci.yml"]
---

# Release Process and Quality Gates

This policy establishes the release cadence, versioning conventions, and mandatory automated quality gates required to publish releases of MedAssist AI.

---

## 1. Versioning Conventions (SemVer 2.0.0)

MedAssist AI adheres strictly to Semantic Versioning (`MAJOR.MINOR.PATCH`):
- **MAJOR (vX.0.0):** Incompatible API changes, breaking schema migrations, removal of existing endpoints or clinical calculators.
- **MINOR (v1.X.0):** Backward-compatible additions: new clinical tools, new DDI screening rules, additional LLM provider adapters.
- **PATCH (v1.0.X):** Backward-compatible bug fixes, UI adjustments, documentation expansions, security patches.

---

## 2. Mandatory Release Quality Gates

A release candidate commit cannot be tagged or published unless **100%** of the following gates pass:

| Gate | Check Command | Pass Threshold |
|:---|:---|:---|
| **Preservation Guard** | `DOCS_STRICT_LINES=1 node scripts/docs/check-no-deletions.cjs` | 0 deleted baseline files, 0 deleted baseline lines |
| **Doc Freshness & Links**| `node scripts/docs/doc-freshness.cjs` | 0 broken internal/relative links |
| **Config Coverage** | `node scripts/docs/check-config-coverage.cjs` | 100% of `.env.example` keys covered in reference docs |
| **Backend Tests** | `npm test --prefix backend` | 77/77 tests passed |
| **Frontend Linter** | `npm run lint --prefix frontend` | 0 errors, 0 warnings |
| **Frontend Tests** | `npm test --prefix frontend` | 61/61 tests passed |
| **Production Build** | `npm run build --prefix frontend` | Clean bundle emitted with no build errors |
| **Dataset Tests** | `python -m unittest discover -s "Model and Dataset"` | 19/19 tests passed |
| **LoRA Dry Run** | `python "Model and Dataset/lora/train_lora.py" --dry-run` | Zero CUDA/PyTorch execution faults |
| **Master Suite** | `node scripts/verify_project.cjs` | 12/12 stages reported PASS (228 total checks) |

---

## 3. Step-by-Step Release Workflow

### Step 3.1: Prepare Release Branch and Update Changelog
1. Create a release branch: `git checkout -b release/vX.Y.Z`.
2. Move unreleased changes in `CHANGELOG.md` under a new section `## [X.Y.Z] - YYYY-MM-DD`.
3. Update version strings in `package.json`, `backend/package.json`, and `frontend/package.json`.

### Step 3.2: Execute Master Verification Runner
```bash
node scripts/verify_project.cjs
```
Verify that all 12 stages report `PASS`.

### Step 3.3: Commit and Tag the Release
```bash
git commit -am "chore(release): prepare release vX.Y.Z"
git tag -a vX.Y.Z -m "Release vX.Y.Z: Summary of key features and clinical tools"
git push origin main --tags
```

### Step 3.4: Build and Publish Production Docker Images
```bash
docker compose build --no-cache
docker tag react-app-llm-backend:latest your-org/medassist-backend:vX.Y.Z
docker tag react-app-llm-frontend:latest your-org/medassist-frontend:vX.Y.Z
```

### Step 3.5: Post-Release Verification
Verify live deployment health endpoints:
```bash
curl --fail https://your-domain.example.com/api/health
curl --fail https://your-domain.example.com/api/ready
```

---

**Evidence:** `package.json`, `CHANGELOG.md`, `scripts/verify_project.cjs`, `.github/workflows/ci.yml`.
