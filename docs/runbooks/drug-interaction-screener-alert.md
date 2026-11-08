---
title: "Runbook: Drug Interaction Screener Alert & Rule Maintenance"
description: "Resolving false positive reports and maintaining the 23 FDA Black Box rules"
quadrant: runbook
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
---

# Runbook: Drug Interaction Screener Alert & Rule Maintenance

**Status:** Stable  
**Severity:** SEV-3 / SEV-4  
**Audience:** Clinical Safety Officers, Backend Developers, Medical Reviewers  
**Technical Quadrant:** Runbook  

---

## 1. Overview & Context

MedAssist runs a deterministic drug-drug interaction (DDI) screener with **23 FDA Boxed Warning and Contraindication rules** (`backend/services/interactionService.js`).

This runbook covers two operational scenarios:
1. **Scenario 1: User Reports a False Positive**: A user or clinical reviewer reports that an educational warning fired incorrectly for a benign combination.
2. **Scenario 2: Adding or Updating a Clinical Interaction Rule**: Incorporating new FDA warnings or updating drug generic/brand synonym regexes.

---

## 2. Investigating False Positives

### Step 2.1: Reproduce the Match
Run a targeted Node one-liner using the reported user prompt:
```bash
node -e "const { detectDrugInteractions } = require('./backend/services/interactionService'); console.log(JSON.stringify(detectDrugInteractions('REPORTED_USER_TEXT_HERE'), null, 2));"
```

### Step 2.2: Identify Matching Regex Tokens
Inspect which rule and regex tokens matched:
- Each rule requires at least one regex in `drugsA` AND at least one regex in `drugsB` to evaluate to `true`.
- Check if a common non-drug word or substring inadvertently matched (e.g. "advil" inside another word). Note that all rules enforce word boundaries (`/\b...\b/i`), but lexical collisions can occasionally occur.

### Step 2.3: Modify Regex or Word Boundary
If a false positive is confirmed:
1. Adjust the specific regex in `backend/services/interactionService.js` to tighten the token boundary.
2. Add a negative test case in `backend/test/interactionService.test.js`:
   ```javascript
   test("does not trigger false positive on non-interacting phrase", () => {
     assert.equal(detectDrugInteractions("Reported non-interacting sentence").length, 0);
   });
   ```
3. Run the backend test suite:
   ```bash
   npm test --prefix backend
   ```

---

## 3. Adding or Updating an FDA Boxed Warning Rule

### Step 3.1: Rule Structure Standard
Every rule in `HIGH_RISK_INTERACTION_RULES` must follow the exact schema:
```javascript
{
  pair: "Drug Class A + Drug Class B (Clinical Risk Summary)",
  drugA: "Descriptive name of Class A with common brand examples",
  drugB: "Descriptive name of Class B with common brand examples",
  severity: "CRITICAL", // or "MAJOR"
  drugsA: [
    /\bgeneric_name\b/i, /\bbrand_name\b/i,
  ],
  drugsB: [
    /\bgeneric_name_b\b/i, /\bbrand_name_b\b/i,
  ],
  description: "FDA Boxed Warning summary explaining mechanism, clinical risks, and monitoring requirements.",
}
```

### Step 3.2: Mandatory Acceptance Criteria for New Rules
1. **Clinical Evidence**: Must cite an official FDA Boxed Warning, package insert contraindication, or major guideline (e.g., American College of Cardiology, American Heart Association).
2. **Word Boundaries**: Every regex in `drugsA` and `drugsB` MUST use word boundaries (`\b`) and case-insensitivity (`i`).
3. **Unit Tests**: Add positive matches (brand + generic, generic + brand) and negative controls in `backend/test/interactionService.test.js`.
4. **Pass Test Suite**: Run `npm test --prefix backend` and verify all 77 tests pass cleanly.

---

## 4. Post-Change Verification

1. Run the full verification suite:
   ```bash
   node scripts/verify_project.cjs
   ```
2. Check `docs/_meta/coverage-matrix.md` and update the DDI rule count if a rule was added.

---

**Evidence:** `backend/services/interactionService.js` (lines 31-480), `backend/test/interactionService.test.js`, `docs/_meta/coverage-matrix.md`.
