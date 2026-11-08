---
title: "How to Add a Deterministic Drug-Drug Interaction Rule"
description: "Instructions for expanding the 23 FDA Boxed Warning drug interaction screener in interactionService.js with deterministic regex matching and unit tests."
quadrant: how-to
audience: [developer, contributor]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["backend/services/interactionService.js", "backend/test/interactionService.test.js", "docs/records/decisions/0002-implement-deterministic-regex-drug-interaction-screener.md"]
---

# How to Add a Deterministic Drug-Drug Interaction Rule

MedAssist AI implements a deterministic pre- and post-generation drug-drug interaction (DDI) safety screening engine in `backend/services/interactionService.js`. Rather than relying on stochastic LLM generation to detect critical pharmacological hazards, the engine matches medication pairs against validated FDA Boxed Warning rules using strict regex patterns with word boundary anchors.

---

## Non-Negotiable Invariants

1. **Word Boundaries:** Every medication name or synonym pattern must use word boundaries (`\b...\b/i`) to prevent substring false positives (e.g. `\bara\b` matching "character" or `\bpla\b` matching "plasma").
2. **Deterministic Matching:** Interaction rules must execute purely deterministically with zero network calls, zero LLM calls, and zero asynchronous promises.
3. **Dual-Phase Screening:** Rules are evaluated both pre-generation on the user prompt and post-generation on the model's generated response.
4. **Structured Educational Warnings:** Every rule must provide severity, physiological mechanism, clinical consequence, and educational mitigation guidance.

---

## Step 1: Formulate the Medication Pattern Pair

Identify the clinical pair from official FDA Boxed Warnings or established pharmacological compendia. Compile comprehensive brand and generic names for both drug classes.

Example rule specification:
- **Class A:** Digoxin (`digoxin`, `lanoxin`, `digitek`)
- **Class B:** Amiodarone (`amiodarone`, `cordarone`, `pacerone`, `nexterone`)
- **Severity:** HIGH
- **Clinical Hazard:** P-glycoprotein inhibition leading to fatal digoxin toxicity, AV block, and ventricular arrhythmias.

---

## Step 2: Append Rule to `HIGH_RISK_INTERACTION_RULES`

Open `backend/services/interactionService.js` and append the new rule object to `HIGH_RISK_INTERACTION_RULES`:

```javascript
{
  pair: "Digoxin + Amiodarone (P-gp Inhibition & Fatal Digoxin Toxicity)",
  drugA: "Digoxin (e.g., Lanoxin, Digitek)",
  drugB: "Amiodarone (e.g., Cordarone, Pacerone)",
  severity: "HIGH",
  drugsA: [
    /\bdigoxin\b/i,
    /\blanoxin\b/i,
    /\bdigitek\b/i,
  ],
  drugsB: [
    /\bamiodarone\b/i,
    /\bcordarone\b/i,
    /\bpacerone\b/i,
    /\bnexterone\b/i,
  ],
  mechanism: "Amiodarone inhibits P-glycoprotein (P-gp) and renal tubular clearance of digoxin, doubling serum digoxin concentrations within 3-5 days.",
  clinicalEffect: "Severe digitalis toxicity manifesting as symptomatic bradycardia, complete heart block, visual disturbances, and life-threatening ventricular tachyarrhythmias.",
  educationalAction: "Empiric 30-50% reduction in digoxin dose upon initiating amiodarone with close serum concentration monitoring and serial ECG assessment."
}
```

---

## Step 3: Add Integration Unit Tests

Open `backend/test/interactionService.test.js` and add test cases validating:
1. Exact positive detection of Class A + Class B generic names.
2. Positive detection of brand name combinations.
3. Negative controls (single drug mentions or unrelated medications must not trigger the rule).
4. Substring immunity (verify that common clinical words containing drug fragments do not trigger).

```javascript
test("detects Digoxin + Amiodarone interaction with brand and generic names", () => {
  const prompt = "Can a patient taking Lanoxin start Cordarone for atrial fibrillation?";
  const warnings = detectDrugInteractions(prompt);
  assert.ok(warnings.some((w) => w.pair.includes("Digoxin + Amiodarone")));
});

test("does not trigger Digoxin rule on single agent query", () => {
  const prompt = "What is the recommended starting dose for digoxin in heart failure?";
  const warnings = detectDrugInteractions(prompt);
  assert.strictEqual(warnings.some((w) => w.pair.includes("Digoxin + Amiodarone")), false);
});
```

---

## Step 4: Verify and Lint

Run the backend integration test suite to verify 100% test pass:

```bash
node --test backend/test/interactionService.test.js
npm test --prefix backend
```

---

**Evidence:** `backend/services/interactionService.js`, `backend/test/interactionService.test.js`, `docs/records/decisions/0002-implement-deterministic-regex-drug-interaction-screener.md`.
