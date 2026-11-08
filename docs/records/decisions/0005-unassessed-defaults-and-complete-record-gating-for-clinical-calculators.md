---
title: "ADR 0005: Unassessed Defaults and Complete Record Gating for Clinical Calculators"
description: "Clinical safety invariants across all 22 interactive clinical scoring tools"
quadrant: record
owner: "@medassist-team"
status: accepted
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
---

# ADR 0005: Unassessed Defaults and Complete Record Gating for Clinical Calculators

**Status:** Accepted  
**Date:** 2026-11-08  
**Deciders:** Clinical Safety Reviewer, Medical Informatics Lead, Frontend Lead  
**Technical Quadrant:** Record  

---

## Context

Clinical risk scoring tools (such as Wells' PE, CHA₂DS₂-VASc, CURB-65, Glasgow Coma Scale, NIH Stroke Scale, and MELD) are widely used to assist medical education and decision-making.

Common UI failure modes in digital medical calculator software include:
1. **Implicit Normal Defaults (Zero-Scoring Bias)**: Defaulting dropdowns or radio buttons to 0 or "No" leads clinicians or students to calculate scores where unexamined physical findings are mistakenly counted as absent/normal, artificially suppressing risk scores.
2. **Premature Score Display**: Calculating intermediate scores as users fill out forms causes cognitive fixation on incomplete risk estimates.
3. **Overprecise Individual Prognostication**: Displaying granular percentage mortality (e.g. "4.3% 30-day mortality") gives false certainty, ignoring individual comorbidity and clinical context.
4. **Outdated Formula Application**: Presenting historical equations (such as the 2016 MELD-Na equation) without distinguishing them from current clinical policy (such as OPTN MELD 3.0) can lead to serious misconceptions.

## Decision

We establish four non-negotiable clinical safety UI invariants across all 22 tools in `frontend/src/components/tools/ClinicalCalculatorsModal.jsx`:

1. **Explicit Unassessed Initial State**:
   - Every input field, dropdown, and radio group initializes to an unassessed state (`""` or `null`).
   - No option defaults to `0`, `false`, or "Normal".
2. **Complete Record Gating**:
   - Scores are computed and displayed only when 100% of required clinical components are actively selected or entered by the user.
   - While incomplete, the UI explicitly displays an amber informational banner:
     `"Assessment Incomplete: Please evaluate all clinical criteria before calculating score."`
3. **Untestable / Not Assessed Explicit Component Options**:
   - For physical assessment scales where patients may have physical limitations (e.g., limb amputation or cast in NIH Stroke Scale motor evaluation), an explicit `"Untestable / Not Assessed (Score 0 with clinical documentation)"` option is provided rather than assuming normal limb function.
4. **Educational Point Bands & Stratification Only**:
   - Individual percentage mortality numbers are removed. Results display qualitative risk tiers and point totals (e.g. "Low Risk (Score 0-1): Clinical probability 1.3-3.4%", "Moderate Risk (Score 2-6)", "High Risk (Score >6)").
5. **Historical MELD-Na Explicit Labeling**:
   - The MELD calculator is explicitly designated as `MELD-Na (2016 Historical Educational Formula, capped at 40)` and includes clinical guidance distinguishing it from current OPTN MELD 3.0 liver allocation policy.

## Consequences

### Positive
- **Eliminates False Negative Bias**: Prevents dangerous inadvertent under-scoring caused by unassessed clinical parameters.
- **Cognitive Clarity**: Forces deliberate consideration of every diagnostic component before presenting risk bands.
- **Ethical & Regulatory Alignment**: Aligns with software as medical device (SaMD) educational standards by preventing over-reliance on automated prognostic calculations.

### Negative
- Requires more clicks/interactions from the user compared to pre-populated forms.

### Neutral
- Standardizes calculation contracts across all 22 clinical tools.

## Alternatives Considered

- **Pre-filling Normal Baseline Values (Zero Defaults)**: Strongly rejected due to clinical safety hazards and potential for catastrophic false negatives in triage settings.
- **Partial Score Calculation with Warnings**: Rejected because users frequently read the prominent numeric score and overlook warning subtext.

---

**Evidence:** `frontend/src/components/tools/ClinicalCalculatorsModal.jsx` (22 tools, state initialization, validation gates), `frontend/src/test/ClinicalCalculatorsModal.test.jsx`, `frontend/src/components/tools/README.md`.
