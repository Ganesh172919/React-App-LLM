---
title: "How to Add a New Clinical Scoring Tool"
description: "Step-by-step developer instructions for implementing a new clinical risk calculator in ClinicalCalculatorsModal.jsx while adhering to mandatory safety invariants."
quadrant: how-to
audience: [developer, contributor]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["frontend/src/components/tools/ClinicalCalculatorsModal.jsx", "frontend/src/test/clinicalCalculators.test.jsx", "docs/records/decisions/0005-unassessed-defaults-and-complete-record-gating-for-clinical-calculators.md"]
---

# How to Add a New Clinical Scoring Tool

MedAssist AI includes 22 client-side clinical calculators designed exclusively for educational assistance. When contributing a new calculator, you must strictly follow the non-negotiable clinical safety invariants detailed below.

---

## Non-Negotiable Invariants

Before writing code, verify that your implementation satisfies all five rules:
1. **Unassessed Default State:** Every input field (select, radio, numeric input) must initialize to an empty value (`""` or `null`). Never default to `0`, `false`, `no`, or `"Normal"`.
2. **Complete Record Gating:** Calculation logic must not execute until 100% of required clinical criteria are explicitly assessed by the user. If any criterion is unselected, render an educational prompt: *"Complete all required clinical criteria to calculate risk tier."*
3. **Point Tiers Only:** Display educational point totals and risk stratifications (e.g. *"Low Risk (0-1 points)"*, *"Moderate Risk"*, *"High Risk"*). Never output individual mortality percentages, life expectancy figures, or deterministic diagnostic verdicts.
4. **Interactive Reset:** Provide a reset action that returns all fields to the unassessed state.
5. **Prompt Insertion:** Provide an "Insert into Chat" handler that formats the completed tool inputs and resulting educational point tier for insertion into the LLM chat composer.

---

## Step 1: Register Calculator in `CALCULATORS` Array

In `frontend/src/components/tools/ClinicalCalculatorsModal.jsx`, add your calculator's ID and label to the `CALCULATORS` constant:

```jsx
const CALCULATORS = [
  // ... existing 22 tools ...
  ["news2", "NEWS2 (National Early Warning Score)"],
];
```

---

## Step 2: Define State Hooks with Unassessed Defaults

Inside `ClinicalCalculatorsModal`, initialize state variables with empty strings:

```jsx
// Example: NEWS2 Respiratory Rate & Oxygen Saturation
const [newsRespRate, setNewsRespRate] = useState("");
const [newsSpo2, setNewsSpo2] = useState("");
const [newsSupplementalO2, setNewsSupplementalO2] = useState("");
const [newsTemp, setNewsTemp] = useState("");
const [newsSystolicBp, setNewsSystolicBp] = useState("");
const [newsHeartRate, setNewsHeartRate] = useState("");
const [newsConsciousness, setNewsConsciousness] = useState("");
```

Ensure the modal's `handleReset` function clears each state back to `""`:

```jsx
const handleReset = () => {
  // ... existing reset logic ...
  setNewsRespRate("");
  setNewsSpo2("");
  setNewsSupplementalO2("");
  setNewsTemp("");
  setNewsSystolicBp("");
  setNewsHeartRate("");
  setNewsConsciousness("");
};
```

---

## Step 3: Implement Calculation with Complete Gating

Gate calculation behind an explicit completeness check:

```jsx
const isNewsComplete =
  newsRespRate !== "" &&
  newsSpo2 !== "" &&
  newsSupplementalO2 !== "" &&
  newsTemp !== "" &&
  newsSystolicBp !== "" &&
  newsHeartRate !== "" &&
  newsConsciousness !== "";

const calculateNewsScore = () => {
  if (!isNewsComplete) return null;

  let score = 0;
  // Calculate points according to published peer-reviewed formula
  // ...
  return score;
};
```

---

## Step 4: Render UI Controls and Educational Tiers

Render accessible input controls with explicit `<label>` tags and distinct `<option>` tags, starting with an unselected placeholder:

```jsx
<select
  id="news-resp-rate"
  value={newsRespRate}
  onChange={(e) => setNewsRespRate(e.target.value)}
  className="w-full rounded border p-2"
>
  <option value="">Select respiratory rate (breaths/min)...</option>
  <option value="low">≤ 8 bpm (3 points)</option>
  <option value="normal">9 – 11 bpm (1 point)</option>
  <option value="optimal">12 – 20 bpm (0 points)</option>
  <option value="elevated">21 – 24 bpm (2 points)</option>
  <option value="high">≥ 25 bpm (3 points)</option>
</select>
```

When incomplete, render the gating banner:
```jsx
{!isNewsComplete ? (
  <div className="rounded bg-amber-50 p-3 text-amber-800 text-sm">
    Complete all 7 clinical parameters above to calculate educational score tier.
  </div>
) : (
  <div className="rounded bg-blue-50 p-3 text-blue-900">
    <div className="font-semibold">Educational Score: {score} Points</div>
    <div className="text-sm">Stratification: {tierLabel}</div>
  </div>
)}
```

---

## Step 5: Add Comprehensive Vitest Unit Tests

Open `frontend/src/test/clinicalCalculators.test.jsx` and add tests verifying:
1. Default unassessed state does not render calculated score.
2. Incomplete input combinations remain gated.
3. Fully assessed inputs yield correct educational tier.
4. Reset button clears all inputs back to unassessed state.

Run the test suite to verify:
```bash
npx vitest run src/test/clinicalCalculators.test.jsx --prefix frontend
```

---

**Evidence:** `frontend/src/components/tools/ClinicalCalculatorsModal.jsx`, `frontend/src/test/clinicalCalculators.test.jsx`, `docs/records/decisions/0005-unassessed-defaults-and-complete-record-gating-for-clinical-calculators.md`.
