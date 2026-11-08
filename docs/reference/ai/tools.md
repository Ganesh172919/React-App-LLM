---
title: "Clinical Tools and Deterministic Screener Specification"
description: "Technical inventory and mathematical definitions of the 22 client-side clinical risk calculators and the 23 FDA Boxed Warning interaction rules."
quadrant: reference
audience: [developer, auditor]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["frontend/src/components/tools/ClinicalCalculatorsModal.jsx", "backend/services/interactionService.js"]
---

# Clinical Tools and Deterministic Screener Specification

MedAssist AI incorporates 22 client-side clinical scoring tools and a 23-rule deterministic drug-drug interaction (DDI) engine. These tools are engineered to assist clinical learners and researchers by grounding calculations in peer-reviewed clinical formulas without stochastic hallucinations.

---

## 1. The 22 Clinical Risk Calculators

All 22 calculators are implemented in `frontend/src/components/tools/ClinicalCalculatorsModal.jsx` and enforce unassessed default states (`""` or `null`) and 100% complete-record gating.

| # | Tool ID | Clinical Tool Name | Target Pathophysiology | Key Variables / Inputs | Output Stratification |
|:---:|:---|:---|:---|:---|:---|
| 1 | `bmi` | Body Mass Index (BMI) | Nutritional & Adiposity Status | Height (cm/in), Weight (kg/lb) | Underweight, Normal, Overweight, Obese Classes I-III |
| 2 | `egfr` | eGFR (CKD-EPI 2021) | Renal Function (Non-Race) | Serum Creatinine, Age, Sex | CKD Stages G1 through G5 |
| 3 | `chads` | CHA₂DS₂-VASc | Non-valvular Atrial Fibrillation Stroke Risk | Age, Sex, CHF, HTN, Stroke/TIA, Vascular, DM | Point tier (0 to 9), Stratified Risk Level |
| 4 | `map` | Mean Arterial Pressure (MAP) | Organ Perfusion Pressure | Systolic BP, Diastolic BP | MAP (mmHg), Perfusion adequacy tier |
| 5 | `crcl` | Cockcroft-Gault CrCl | Drug Dosing Renal Clearance | Age, Sex, Weight, Serum Creatinine | CrCl (mL/min), Renal impairment tiers |
| 6 | `calcium` | Corrected Calcium | Hypoalbuminemia Calcium Correction | Measured Calcium, Serum Albumin | Corrected Calcium (mg/dL) |
| 7 | `aniongap` | Serum Anion Gap | Metabolic Acidosis Differential | Sodium, Chloride, Bicarbonate | Normal vs Elevated Anion Gap (> 12 mEq/L) |
| 8 | `fena` | Fractional Excretion of Sodium (FeNa) | Acute Kidney Injury (Prerenal vs ATN) | Urine Na, Serum Na, Urine Cr, Serum Cr | Prerenal (< 1%), Intrinsic ATN (> 2%) |
| 9 | `feurea` | Fractional Excretion of Urea (FeUrea) | AKI on Diuretic Therapy | Urine Urea, Blood Urea, Urine Cr, Serum Cr | Prerenal (< 35%), Intrinsic ATN (> 50%) |
| 10 | `fluids` | Pediatric 4-2-1 Fluid Rule | Hourly Maintenance Intravenous Fluids | Body Weight (kg) | Hourly rate (mL/hr) and 24-hour total volume |
| 11 | `wells` | Wells' Criteria for PE | Pulmonary Embolism Probability | HR, DVT signs, Alternative Dx, Hemoptysis, Malignancy | PE Unlikely (≤ 4 pts) vs PE Likely (> 4 pts) |
| 12 | `curb65` | CURB-65 Pneumonia Severity | Community-Acquired Pneumonia Mortality | Confusion, BUN, Resp Rate, BP, Age ≥ 65 | Low (0-1), Intermediate (2), High (3-5) |
| 13 | `gcs` | Glasgow Coma Scale (GCS) | Neurological Impairment & Coma | Eye Opening, Verbal Response, Motor Response | Severe (3-8), Moderate (9-12), Mild (13-15) |
| 14 | `hasbled` | HAS-BLED Bleeding Risk | Major Bleeding on Anticoagulation | HTN, Renal/Liver, Stroke, Bleeding, Labile INR, Age, Drugs/Alcohol | Low Risk (0-2) vs High Risk (≥ 3 points) |
| 15 | `qsofa` | quick SOFA (qSOFA) | Sepsis Bedside Screening | Altered Mentation, Resp Rate ≥ 22, Systolic BP ≤ 100 | Not High Risk (< 2) vs High Sepsis Risk (≥ 2) |
| 16 | `bsa` | Body Surface Area (Mosteller) | Chemotherapy & Hemodynamic Dosing | Height (cm), Weight (kg) | BSA ($m^2 = \sqrt{\frac{H \times W}{3600}}$) |
| 17 | `apri` | APRI (AST to Platelet Ratio) | Hepatic Fibrosis & Cirrhosis | AST, AST Upper Limit of Normal, Platelet Count | Fibrosis Unlikely (< 0.5), Cirrhosis Likely (> 1.5) |
| 18 | `childpugh` | Child-Pugh Score | Chronic Liver Disease & Cirrhosis | Bilirubin, Albumin, INR, Ascites, Encephalopathy | Class A (5-6), Class B (7-9), Class C (10-15) |
| 19 | `meld` | 2016 MELD-Na (Historical) | End-Stage Liver Disease Mortality | Bilirubin, INR, Creatinine, Sodium (capped 40) | Educational 2016 MELD-Na point tier |
| 20 | `centor` | Centor Pharyngitis Criteria | Group A Streptococcal Pharyngitis | Fever, Tonsillar Exudate, Tender Nodes, No Cough, Age | Strep Score 0-4+, Management Tier |
| 21 | `heart` | HEART Score | Emergency Chest Pain Risk (MACE) | History, ECG, Age, Risk Factors, Initial Troponin | Low (0-3), Moderate (4-6), High (7-10) |
| 22 | `perc` | PERC Rule-Out Criteria | Pulmonary Embolism Rule-Out | 8 low-risk criteria | PERC Positive (Any present) vs PERC Negative |

---

## 2. The 23 Deterministic Drug Interaction Rules

The DDI engine in `backend/services/interactionService.js` screens against 23 FDA Boxed Warning interactions:
1. **Anticoagulants/Antiplatelets + NSAIDs/Aspirin:** Major gastrointestinal & systemic hemorrhage.
2. **PDE5 Inhibitors + Nitrates:** Severe refractory hypotension & cardiac arrest.
3. **Serotonergic Opioids + SSRIs/SNRIs:** Serotonin syndrome (hyperthermia, clonus, delirium).
4. **ACE Inhibitors/ARBs + Potassium-Sparing Diuretics:** Life-threatening hyperkalemic cardiac arrest.
5. **Methotrexate + Trimethoprim-Sulfamethoxazole:** Severe pancytopenia and toxic bone marrow necrosis.
6. **Fluoroquinolones + Systemic Corticosteroids:** Bilateral tendinitis and Achilles tendon rupture.
7. **Benzodiazepines + Opioids:** Profound sedation, respiratory depression, coma, and death.
8. **Lithium + NSAIDs / ACE Inhibitors:** Decreased renal lithium clearance and severe neurotoxicity.
9. **Allopurinol/Febuxostat + Azathioprine/6-MP:** Severe bone marrow failure and fatal agranulocytosis.
10. **Methotrexate + NSAIDs/Aspirin:** Fatal methotrexate toxicity due to impaired tubular secretion.
11. **Warfarin + TMP-SMX (Bactrim):** CYP2C9 inhibition causing dangerous INR spike and hemorrhage.
12. **Clopidogrel + Omeprazole/Esomeprazole:** CYP2C19 inhibition blocking conversion to active metabolite.
13. **SSRIs/SNRIs/MAOIs + Triptans:** Life-threatening serotonin syndrome.
14. **TMP-SMX (Bactrim) + ACEi/ARBs/Spironolactone:** Synergistic hyperkalemic cardiac arrest.
15. **Theophylline + Fluoroquinolones:** CYP1A2 inhibition causing seizures and fatal arrhythmias.
16. **Digoxin + Clarithromycin/Erythromycin:** P-glycoprotein inhibition causing acute digoxin toxicity.
17. **Statins (Simvastatin/Atorvastatin) + Gemfibrozil:** Severe rhabdomyolysis and myoglobinuric renal failure.
18. **Ciprofloxacin/Levofloxacin + Polyvalent Cations (Iron, Calcium, Antacids):** Chelation abolishing antibiotic bioavailability.
19. **MAOIs + Tyramine-Rich Foods / Sympathomimetics:** Severe hypertensive crisis and intracranial hemorrhage.
20. **Colchicine + Strong CYP3A4 / P-gp Inhibitors (Clarithromycin, Ketoconazole):** Multi-organ failure and death.
21. **Carbamazepine + CYP3A4 Inhibitors:** Toxic carbamazepine levels with ataxia, nystagmus, and coma.
22. **Linezolid + SSRIs/SNRIs:** Non-selective MAO inhibition precipitating acute serotonin syndrome.
23. **Sildenafil/Tadalafil + Alpha-1 Blockers:** Additive vasodilatory profound orthostatic hypotension.

---

**Evidence:** `frontend/src/components/tools/ClinicalCalculatorsModal.jsx`, `backend/services/interactionService.js`, `frontend/src/test/clinicalCalculators.test.jsx`, `backend/test/interactionService.test.js`.
