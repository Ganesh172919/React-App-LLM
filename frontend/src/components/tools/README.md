# MedAssist AI — Clinical Calculators Architecture & Reference Manual

Developed by **J Ganesh kumar reddy**  
*Full-Stack Educational Health Assistance, Biomedical Evidence Grounding, & Machine Learning Research Platform*

---

## 1. Executive Overview & Clinical Tools Topology

The MedAssist AI clinical calculation engine (`frontend/src/components/tools/ClinicalCalculatorsModal.jsx`) implements 13 evidence-based physiological scoring tools. Designed strictly for educational exploration and student learning, all calculators implement deterministic arithmetic, strict physiological input clamping, and accessible WAI-ARIA keyboard navigation patterns.

> [!CAUTION]
> **Educational & Learning Notice**: These tools are educational demonstrations. Numeric scores do not establish clinical diagnoses, treatment plans, or formal prognosis. Clinical decisions must always be guided by qualified healthcare providers and institutional protocols.

```
========================================================================================================================
                          MEDASSIST AI — CLINICAL CALCULATORS SUITE TOPOLOGY
========================================================================================================================

    [ USER INTERACTION: "Clinical Tools" Button / Keyboard Shortcut ]
                           │
                           ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                WAI-ARIA ACCESSIBLE MODAL CONTAINER                                             │
    │  - Role: `role="dialog"` with `aria-modal="true"` and `aria-labelledby="calculators-title"`                    │
    │  - Tablist Controller: `role="tablist"` with `aria-orientation="horizontal"`                                   │
    │  - Keyboard Navigation:                                                                                        │
    │      ├── ArrowRight / ArrowDown: Next calculator tab (wrapping)                                                │
    │      ├── ArrowLeft / ArrowUp: Previous calculator tab (wrapping)                                               │
    │      ├── Home / End: First (`bmi`) / Last (`gcs`) calculator tab                                               │
    │      ├── Escape: Closes modal and restores focus to previous active element                                    │
    │      └── Tab / Shift+Tab: Traps keyboard focus strictly within active modal bounds                             │
    └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┬─────────────────┐
         │                 │                 │                 │
         ▼                 ▼                 ▼                 ▼
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │ RENAL &     │   │ CARDIAC &   │   │ ACUTE CARE  │   │ METABOLIC & │
    │ CLEARANCE   │   │ STROKE RISK │   │ & CRITICAL  │   │ ELECTROLYTES│
    │ - eGFR CKD  │   │ - CHA2DS2   │   │ - Wells PE  │   │ - Corr. Ca  │
    │ - CrCl CG   │   │   VASc      │   │ - CURB-65   │   │ - Anion Gap │
    │ - FeNa /    │   │ - Mean Art. │   │ - GCS Score │   │ - MELD Score│
    │   FeUrea    │   │   Pressure  │   │ - Fluids 421│   │ - BMI & BSA │
    └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
                           │                 │                 │
                           └─────────────────┼─────────────────┘
                                             │
                                             ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                ACTION: "INSERT INTO CHAT" / "COPY TRANSCRIPT"                                  │
    │  - Formulates structured clinical question prompt from calculated values                                       │
    │  - Automatically triggers evidence-grounded PubMed retrieval on the generated inquiry                          │
    └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
========================================================================================================================
```

---

## 2. Clinical Calculators Mindmap

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0284c7', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#0369a1', 'lineColor': '#0284c7', 'secondaryColor': '#0d9488', 'tertiaryColor': '#6366f1' }}}%%
mindmap
  root((Clinical Calculators))
    ::icon(fa fa-calculator)
    (01 Renal & Clearance)
      eGFR CKD-EPI 2021
        Race-Free Standardization
        Age 18 to 120 Clamping
        Creatinine 0.1 to 25.0 mg/dL
      Creatinine Clearance
        Cockcroft-Gault Equation
        Clamped Weight 20 to 300 kg
        Female Correction Factor 0.85
      Fractional Excretions
        FeNa for Prerenal vs ATN (<1% vs >2%)
        FeUrea for Diuretic-Treated AKI (<35%)
    (02 Cardiac & Vascular)
      CHA2DS2-VASc
        Atrial Fibrillation Stroke Risk (0 to 9)
        Age Bands: <65 (0), 65-74 (+1), 75+ (+2)
      Mean Arterial Pressure (MAP)
        Formula: (2*DBP + SBP) / 3
        Target >= 65 mmHg in Sepsis
    (03 Acute Severity)
      Wells Criteria for PE
        Clinical Probability (0 to 12.5)
        PE Unlikely <= 4 vs PE Likely > 4
      CURB-65 Pneumonia
        Mortality Risk Stratification (0 to 5)
      Glasgow Coma Scale (GCS)
        Eye (1-4), Verbal (1-5), Motor (1-6)
      Maintenance Fluids (4-2-1)
        Hourly Rate (4 mL/kg + 2 mL/kg + 1 mL/kg)
    (04 Metabolic & Liver)
      Corrected Calcium (Payne)
        Hypoalbuminemia Formula
      Serum Anion Gap
        Formula: Na - (Cl + HCO3)
```

---

## 3. Mathematical Formulations & Physiological Boundaries

### 3.1 Body Mass Index (BMI) & DuBois Body Surface Area (BSA)
$$\text{BMI} = \frac{\text{Weight (kg)}}{[\text{Height (m)}]^2}$$
$$\text{BSA} = 0.007184 \times [\text{Height (cm)}]^{0.725} \times [\text{Weight (kg)}]^{0.425}$$
- **Physiological Clamping**: Weight $20 - 300\text{ kg}$, Height $50 - 250\text{ cm}$.

### 3.2 eGFR (CKD-EPI 2021 Race-Free Equation)
$$\text{eGFR} = 142 \times \min\left(\frac{S_{\text{cr}}}{\kappa}, 1\right)^\alpha \times \max\left(\frac{S_{\text{cr}}}{\kappa}, 1\right)^{-1.200} \times 0.9938^{\text{Age}} \times [1.012 \text{ if Female}]$$
Where:
- $\kappa = 0.7$ (Female) or $0.9$ (Male)
- $\alpha = -0.241$ (Female) or $-0.302$ (Male)
- **Physiological Clamping**: Age $18 - 120\text{ years}$, $S_{\text{cr}} = 0.1 - 25.0\text{ mg/dL}$.

### 3.3 Cockcroft-Gault Creatinine Clearance (CrCl)
$$\text{CrCl} = \frac{(140 - \text{Age}) \times \text{Weight (kg)}}{72 \times S_{\text{cr}}} \times [0.85 \text{ if Female}]$$
- **Physiological Clamping**: Age $18 - 120$, Weight $20 - 300\text{ kg}$, $S_{\text{cr}} = 0.1 - 25.0\text{ mg/dL}$.

### 3.4 Mean Arterial Pressure (MAP)
$$\text{MAP} = \frac{2 \times \text{DBP} + \text{SBP}}{3}$$
- **Physiological Clamping**: $\text{SBP} = 40 - 300\text{ mmHg}$, $\text{DBP} = 20 - 200\text{ mmHg}$.

### 3.5 Corrected Calcium (Payne Formula)
$$\text{Corrected Calcium (mg/dL)} = \text{Serum Calcium} + 0.8 \times (4.0 - \text{Serum Albumin})$$
- **Physiological Clamping**: Calcium $4.0 - 20.0\text{ mg/dL}$, Albumin $0.5 - 6.0\text{ g/dL}$.

### 3.6 Fractional Excretion of Sodium (FeNa) & Urea (FeUrea)
$$\text{FeNa (\%)} = \frac{\text{Urine Na} \times \text{Serum Cr}}{\text{Serum Na} \times \text{Urine Cr}} \times 100$$
$$\text{FeUrea (\%)} = \frac{\text{Urine Urea} \times \text{Serum Cr}}{\text{Serum BUN} \times \text{Urine Cr}} \times 100$$
- **Interpretation Bands**: $\text{FeNa} < 1\%$ (Prerenal etiology); $\text{FeNa} > 2\%$ (Intrinsic acute tubular necrosis). $\text{FeUrea} < 35\%$ indicates prerenal azotemia when loop diuretics are active.

### 3.7 Maintenance Fluids (4-2-1 Rule)
- $4\text{ mL/kg/h}$ for first $10\text{ kg}$ ($0 - 10\text{ kg}$)
- $+ 2\text{ mL/kg/h}$ for next $10\text{ kg}$ ($11 - 20\text{ kg}$)
- $+ 1\text{ mL/kg/h}$ for each $\text{kg} > 20\text{ kg}$
- Example ($70\text{ kg}$ adult): $40 + 20 + 50 = 110\text{ mL/hour}$.

---

## 4. Developer Extensibility: Adding Calculator #14

Follow this architectural guide to add a new calculator (e.g., `MELD-Na`):

```jsx
// Excerpt from frontend/src/components/tools/ClinicalCalculatorsModal.jsx
// Step 1: Add tab key to tabList array:
const tabList = [
  "bmi", "egfr", "chads", "map", "crcl", "calcium",
  "aniongap", "fena", "feurea", "fluids", "wells", "curb65", "gcs", "meld"
];

// Step 2: Implement deterministic formula with clamping:
function calculateMeldScore(creatinine, bilirubin, inr, sodium) {
  const safeCr = Math.min(4.0, Math.max(1.0, creatinine));
  const safeBili = Math.max(1.0, bilirubin);
  const safeInr = Math.max(1.0, inr);
  const safeNa = Math.min(135, Math.max(125, sodium));

  let meld = 9.57 * Math.log(safeCr) + 3.78 * Math.log(safeBili) + 11.2 * Math.log(safeInr) + 6.43;
  meld = Math.min(40, Math.max(6, Math.round(meld)));

  if (meld > 11) {
    meld = meld + 1.32 * (137 - safeNa) - (0.033 * meld * (137 - safeNa));
    meld = Math.min(40, Math.max(6, Math.round(meld)));
  }
  return meld;
}

// Step 3: Add WAI-ARIA tab button and tabpanel in JSX:
<button
  role="tab"
  id="tab-meld"
  aria-selected={activeTab === "meld"}
  aria-controls="panel-meld"
  onClick={() => setActiveTab("meld")}
>
  MELD-Na
</button>

<div
  role="tabpanel"
  id="panel-meld"
  aria-labelledby="tab-meld"
  hidden={activeTab !== "meld"}
>
  {/* Form inputs with physiological min/max bounds */}
</div>
```

---

## 5. Automated Verification Commands

All 13 clinical calculators are verified by 11 unit tests in `frontend/src/test/clinicalCalculators.test.jsx`:

```powershell
# Run the clinical calculators test suite
npm test --prefix frontend -- clinicalCalculators.test.jsx

# Run Playwright browser tests verifying calculator tabpanel accessibility
node scripts/browser_verify_dark_and_tools.cjs
```
