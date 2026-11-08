---
title: "ADR 0002: Implement Deterministic Regex Drug Interaction Screener"
description: "Zero-latency screening of 23 FDA Black Box warning medication pairs"
quadrant: record
owner: "@medassist-team"
status: accepted
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
---

# ADR 0002: Implement Deterministic Regex Drug Interaction Screener

**Status:** Accepted  
**Date:** 2026-11-08  
**Deciders:** Clinical Safety Reviewer, AI Safety Lead, Backend Lead  
**Technical Quadrant:** Record  

---

## Context

MedAssist is an educational clinical assistant that answers healthcare and medication questions. Users often ask about combinations of medications (such as blood thinners and pain relievers, or antidepressants and migraine therapies).

Large Language Models (LLMs) are probabilistic and prone to:
- **Hallucinated Interactions**: Claiming dangerous interactions when none exist.
- **Omission of Critical Contraindications**: Missing life-threatening FDA Black Box warnings under specific prompt formulations, jailbreak attempts, or token pressure.
- **Latency Overheads**: Querying external pharmacology APIs on every conversational turn introduces latency and external network failure points.

## Decision

We implement a synchronous, deterministic regex-based drug-drug interaction (DDI) safety screener in `backend/services/interactionService.js` that evaluates user inputs and AI outputs prior to and following LLM generation.

Key technical specifications:
1. **Rule Set**: 23 FDA Black Box warning and contraindication pairs covering:
   - Anticoagulants/Antiplatelets + NSAIDs/Aspirin (Major Bleeding)
   - PDE5 Inhibitors + Nitrates (Profound Hypotension)
   - Serotonergic Opioids/Agents + SSRIs/SNRIs (Serotonin Syndrome)
   - ACE Inhibitors/ARBs + K-sparing Diuretics/Potassium (Fatal Hyperkalemia)
   - Methotrexate + Bactrim (Fatal Bone Marrow Suppression & AKI)
   - Fluoroquinolones + Systemic Corticosteroids (Tendon Rupture)
   - Benzodiazepines + Opioids (Respiratory Depression & Coma)
   - Lithium + NSAIDs/ACE Inhibitors (Lithium Neurotoxicity)
   - Allopurinol/Febuxostat + Azathioprine/6-MP (Severe Pancytopenia)
   - Clopidogrel + Omeprazole/Esomeprazole (Antiplatelet Efficacy Loss)
   - SSRIs/SNRIs/MAOIs + Triptans (Serotonin Syndrome)
   - Bactrim + ACE Inhibitors/ARBs/K-Sparing Diuretics (Refractory Hyperkalemia)
   - Theophylline + Fluoroquinolones (CYP1A2 Inhibition, Seizures)
   - Linezolid + SSRIs/SNRIs (MAOI Serotonin Syndrome)
   - Warfarin + Amiodarone (CYP2C9/CYP3A4 Inhibition, INR Surge)
2. **Deterministic Matching**:
   Each rule defines two regex token arrays (`drugsA` and `drugsB`). An interaction warning is triggered if and only if both sets match against word-bounded drug brand and generic names:
   ```javascript
   const hasA = rule.drugsA.some((p) => p.test(normalized));
   const hasB = rule.drugsB.some((p) => p.test(normalized));
   if (hasA && hasB) { /* emit warning */ }
   ```
3. **Dual Execution**: The screener runs on incoming user prompts to append cautionary clinical context, and runs on outgoing AI answers to guarantee clinical safety alerts are never omitted.

## Consequences

### Positive
- **Guaranteed Zero-Latency Verification**: Executes in < 2ms without external network calls or database queries.
- **Deterministic Invariant**: Never misses the 23 hardcoded FDA Black Box warning pairs regardless of LLM temperature, sampling, or prompt variations.
- **Clear Clinical Disclaimers**: Attaches standardized clinical guidance advising consultation with prescribers or pharmacists without giving autonomous prescription changes.

### Negative
- **Lexical Limitations**: Does not resolve drug brand names, typos, or slang not captured in the regex patterns.
- **No Dose-Dependent Assessment**: Cannot evaluate whether a patient's dosage, route of administration (topical vs systemic), or scheduling offsets risk.
- **Maintenance Overhead**: Expanding coverage requires manual curation and testing of regex token sets.

### Neutral
- Explicitly documented as an educational screening tool, not a full clinical medication reconciliation engine.

## Alternatives Considered

- **Sole Reliance on LLM Prompt Engineering**: Rejected because prompt instructions cannot guarantee 100% adherence under adversarial prompts or model hallucinations.
- **External Pharmacology API (e.g., RxNorm / DailyMed / NIH API)**: Evaluated for future integration, but rejected as a synchronous blocking dependency in the chat generation loop due to rate limits and network latency.

---

**Evidence:** `backend/services/interactionService.js` (`HIGH_RISK_INTERACTION_RULES`, `detectDrugInteractions`), `backend/test/interactionService.test.js`, `backend/services/answerService.js`.
