# MedAssist AI — Clinical Calculators Architecture & Reference Manual

Developed by **J Ganesh kumar reddy**  
*Full-Stack Educational Health Assistance, Biomedical Evidence Grounding, & Machine Learning Research Platform*

---

## 1. Executive Overview & Clinical Tools Topology

The MedAssist AI clinical calculation engine (`frontend/src/components/tools/ClinicalCalculatorsModal.jsx`) implements 21 evidence-based physiological scoring tools. Designed strictly for educational exploration and student learning, all calculators implement deterministic arithmetic, strict physiological input clamping, and accessible WAI-ARIA keyboard navigation patterns.

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
      HEART Score for Chest Pain
        MACE Risk Stratification (0 to 10)
        Low (0-3), Moderate (4-6), High (7-10)
    (03 Acute Severity)
      Wells Criteria for PE
        Clinical Probability (0 to 12.5)
        PE Unlikely <= 4 vs PE Likely > 4
      CURB-65 Pneumonia
        Mortality Risk Stratification (0 to 5)
      Glasgow Coma Scale (GCS)
        Eye (1-4), Verbal (1-5), Motor (1-6)
      HAS-BLED Bleeding Risk
        Points 0 to 9 (High Risk >= 3)
      qSOFA Sepsis Screen
        RR >= 22, Altered Mentation, SBP <= 100
      Modified Centor (McIsaac)
        Strep Pharyngitis Probability (-1 to 5)
      Maintenance Fluids (4-2-1)
        Hourly Rate (4 mL/kg + 2 mL/kg + 1 mL/kg)
    (04 Metabolic & Hepatic)
      Corrected Calcium (Payne)
        Hypoalbuminemia Formula
      Serum Anion Gap
        Formula: Na - (Cl + HCO3)
      Mosteller BSA
        Metric: sqrt(Ht*Wt/3600)
        Imperial: sqrt(Ht*Wt/3131)
      APRI (Liver Fibrosis)
        Formula: (AST/ULN)*100 / Platelets
        Cutoffs: <0.50 vs >1.50
      Child-Pugh (Cirrhosis)
        Bilirubin, Albumin, INR, Ascites, Enceph
        Classes: A (5-6), B (7-9), C (10-15)
```

---

## 3. Mathematical Formulations & Physiological Boundaries

### 3.1 Body Mass Index (BMI) & DuBois Body Surface Area (BSA)
$$\text{BMI} = \frac{\text{Weight (kg)}}{[\text{Height (m)}]^2}$$
$$\text{BSA (DuBois)} = 0.007184 \times [\text{Height (cm)}]^{0.725} \times [\text{Weight (kg)}]^{0.425}$$
- **Physiological Clamping**: Weight $20 - 300\text{ kg}$, Height $50 - 250\text{ cm}$.

### 3.2 Mosteller Body Surface Area (BSA)
$$\text{BSA (Metric)} = \sqrt{\frac{\text{Height (cm)} \times \text{Weight (kg)}}{3600}}$$
$$\text{BSA (Imperial)} = \sqrt{\frac{\text{Height (in)} \times \text{Weight (lbs)}}{3131}}$$
- **Clinical Role**: Universally adopted standard for indexing physiological parameters (e.g., cardiac output, GFR), renal replacement therapy dosing, and body-surface indexed oncologic chemotherapy.
- **Reference Ranges**: Average adult female $\approx 1.6\text{ m}^2$; average adult male $\approx 1.9\text{ m}^2$.

### 3.3 AST to Platelet Ratio Index (APRI) for Liver Fibrosis
$$\text{APRI} = \frac{(\text{AST} / \text{AST}_{\text{ULN}}) \times 100}{\text{Platelet Count (}\times 10^9/\text{L})}$$
Where:
- $\text{AST}_{\text{ULN}}$ defaults to $40\text{ U/L}$ (standard institutional laboratory upper limit of normal).
- **Physiological Clamping**: AST $5 - 2000\text{ U/L}$, Platelets $10 - 1500 \times 10^9/\text{L}$.
- **Risk Stratification Bands**:
  - $\text{Score} < 0.50$: Cirrhosis / advanced fibrosis unlikely (high negative predictive value).
  - $0.50 \le \text{Score} \le 1.50$: Indeterminate / intermediate fibrosis probability (warrants secondary elastography).
  - $\text{Score} > 1.50$: High probability of significant fibrosis / cirrhosis (prompt hepatology evaluation).

### 3.4 eGFR (CKD-EPI 2021 Race-Free Equation)
$$\text{eGFR} = 142 \times \min\left(\frac{S_{\text{cr}}}{\kappa}, 1\right)^\alpha \times \max\left(\frac{S_{\text{cr}}}{\kappa}, 1\right)^{-1.200} \times 0.9938^{\text{Age}} \times [1.012 \text{ if Female}]$$
Where:
- $\kappa = 0.7$ (Female) or $0.9$ (Male)
- $\alpha = -0.241$ (Female) or $-0.302$ (Male)
- **Physiological Clamping**: Age $18 - 120\text{ years}$, $S_{\text{cr}} = 0.1 - 25.0\text{ mg/dL}$.

### 3.5 Cockcroft-Gault Creatinine Clearance (CrCl)
$$\text{CrCl} = \frac{(140 - \text{Age}) \times \text{Weight (kg)}}{72 \times S_{\text{cr}}} \times [0.85 \text{ if Female}]$$
- **Physiological Clamping**: Age $18 - 120$, Weight $20 - 300\text{ kg}$, $S_{\text{cr}} = 0.1 - 25.0\text{ mg/dL}$.

### 3.6 Mean Arterial Pressure (MAP)
$$\text{MAP} = \frac{2 \times \text{DBP} + \text{SBP}}{3}$$
- **Physiological Clamping**: $\text{SBP} = 40 - 300\text{ mmHg}$, $\text{DBP} = 20 - 200\text{ mmHg}$.

### 3.7 Corrected Calcium (Payne Formula)
$$\text{Corrected Calcium (mg/dL)} = \text{Serum Calcium} + 0.8 \times (4.0 - \text{Serum Albumin})$$
- **Physiological Clamping**: Calcium $4.0 - 20.0\text{ mg/dL}$, Albumin $0.5 - 6.0\text{ g/dL}$.

### 3.8 Fractional Excretion of Sodium (FeNa) & Urea (FeUrea)
$$\text{FeNa (\%)} = \frac{\text{Urine Na} \times \text{Serum Cr}}{\text{Serum Na} \times \text{Urine Cr}} \times 100$$
$$\text{FeUrea (\%)} = \frac{\text{Urine Urea} \times \text{Serum Cr}}{\text{Serum BUN} \times \text{Urine Cr}} \times 100$$
- **Interpretation Bands**: $\text{FeNa} < 1\%$ (Prerenal etiology); $\text{FeNa} > 2\%$ (Intrinsic acute tubular necrosis). $\text{FeUrea} < 35\%$ indicates prerenal azotemia when loop diuretics are active.

### 3.9 Maintenance Fluids (4-2-1 Rule)
- $4\text{ mL/kg/h}$ for first $10\text{ kg}$ ($0 - 10\text{ kg}$)
- $+ 2\text{ mL/kg/h}$ for next $10\text{ kg}$ ($11 - 20\text{ kg}$)
- $+ 1\text{ mL/kg/h}$ for each $\text{kg} > 20\text{ kg}$
- Example ($70\text{ kg}$ adult): $40 + 20 + 50 = 110\text{ mL/hour}$.

### 3.10 Child-Pugh Score for Cirrhosis Mortality
$$\text{Child-Pugh Score} = \text{Bilirubin Pts} + \text{Albumin Pts} + \text{INR Pts} + \text{Ascites Pts} + \text{Encephalopathy Pts}$$

- **Physiological Clamping**:
  - Total Bilirubin: $0.1 - 50.0\text{ mg/dL}$
  - Serum Albumin: $0.5 - 6.0\text{ g/dL}$
  - INR: $0.5 - 10.0$
- **Point Assignment Matrix**:
  | Variable | 1 Point | 2 Points | 3 Points |
  | :--- | :--- | :--- | :--- |
  | **Total Bilirubin** | $< 2.0\text{ mg/dL}$ | $2.0 - 3.0\text{ mg/dL}$ | $> 3.0\text{ mg/dL}$ |
  | **Serum Albumin** | $> 3.5\text{ g/dL}$ | $2.8 - 3.5\text{ g/dL}$ | $< 2.8\text{ g/dL}$ |
  | **INR** | $< 1.7$ | $1.7 - 2.3$ | $> 2.3$ |
  | **Ascites** | None | Slight / Diuretic-controlled | Moderate to Severe / Refractory |
  | **Encephalopathy** | None | Grade 1–2 (mild confusion) | Grade 3–4 (severe / coma) |
- **Prognostic Risk Stratification**:
  - **Class A ($5 - 6$ points)**: Well-compensated cirrhosis; 1-year survival $\approx 100\%$, 2-year survival $\approx 85\%$, perioperative abdominal mortality $\approx 10\%$.
  - **Class B ($7 - 9$ points)**: Significant functional compromise; 1-year survival $\approx 80\%$, 2-year survival $\approx 60\%$, perioperative abdominal mortality $\approx 30\%$.
  - **Class C ($10 - 15$ points)**: Decompensated cirrhosis; 1-year survival $\approx 45\%$, 2-year survival $\approx 35\%$, perioperative abdominal mortality $\approx 70 - 80\%$.

### 3.11 Wells' Criteria for Pulmonary Embolism (PE)
$$\text{Wells Score} = \sum \text{Points across 7 Clinical Criteria}$$
- **Criteria & Points**:
  - Clinical signs and symptoms of DVT: $+3.0$
  - Alternative diagnosis is less likely than PE: $+3.0$
  - Heart rate $> 100\text{ bpm}$: $+1.5$
  - Immobilization ($\ge 3$ consecutive days) or surgery in previous 4 weeks: $+1.5$
  - Previous documented DVT/PE: $+1.5$
  - Hemoptysis: $+1.0$
  - Malignancy (treatment within 6 months or palliative): $+1.0$
- **Stratification**:
  - Score $\le 4.0$: PE Unlikely ($\approx 12.1\%$ PE incidence; recommend high-sensitivity D-dimer).
  - Score $> 4.0$: PE Likely ($\approx 37.1\%$ PE incidence; recommend CT Pulmonary Angiography).

### 3.12 CURB-65 Pneumonia Severity Score
$$\text{CURB-65 Score} = C + U + R + B + 65$$
- **Criteria (1 point each)**:
  - **C**onfusion (Abbreviated Mental Test score $\le 8$ or new disorientation)
  - **U**rea $> 19\text{ mg/dL}$ ($> 7\text{ mmol/L}$)
  - **R**espiratory Rate $\ge 30\text{ breaths/min}$
  - **B**lood Pressure (Systolic $< 90\text{ mmHg}$ or Diastolic $\le 60\text{ mmHg}$)
  - Age $\ge \mathbf{65}\text{ years}$
- **30-Day Mortality Stratification**:
  - Score $0 - 1$: Low risk ($< 3\%$ mortality; appropriate for outpatient management).
  - Score $2$: Intermediate risk ($\approx 9\%$ mortality; recommend short in-hospital stay or close monitoring).
  - Score $3 - 5$: High risk ($15 - 40\%$ mortality; recommend urgent hospital admission / ICU evaluation).

### 3.13 Glasgow Coma Scale (GCS)
$$\text{GCS Score} = \text{Eye (1–4)} + \text{Verbal (1–5)} + \text{Motor (1–6)}$$
- **Components**:
  - **Eye Opening ($E$)**: 4 = Spontaneous, 3 = To verbal command, 2 = To pain, 1 = None.
  - **Verbal Response ($V$)**: 5 = Oriented, 4 = Confused speech, 3 = Inappropriate words, 2 = Incomprehensible sounds, 1 = None.
  - **Motor Response ($M$)**: 6 = Obeys commands, 5 = Localizes to pain, 4 = Withdraws from pain, 3 = Flexion to pain (decorticate), 2 = Extension to pain (decerebrate), 1 = None.
- **Stratification**:
  - Score $13 - 15$: Mild traumatic brain injury / Alert.
  - Score $9 - 12$: Moderate brain injury.
  - Score $3 - 8$: Severe brain injury / Coma (loss of airway protective reflexes; prompt endotracheal intubation consideration).

### 3.14 HAS-BLED Bleeding Risk Score
$$\text{HAS-BLED Score} = H + A + S + B + L + E + D$$
- **Components (0–9 points)**:
  - **H**ypertension (Uncontrolled SBP $> 160\text{ mmHg}$): $+1$
  - **A**bnormal Renal or Liver function: $+1$ or $+2$
  - **S**troke history: $+1$
  - **B**leeding history or predisposition: $+1$
  - **L**abile INRs (time in therapeutic range $< 60\%$): $+1$
  - **E**lderly (Age $> 65$): $+1$
  - **D**rugs (antiplatelet agents/NSAIDs) or Alcohol excess: $+1$ or $+2$
- **Stratification**:
  - Score $0 - 1$: Low bleeding risk ($\approx 1.13\text{ bleeds / 100 pt-yrs}$).
  - Score $2$: Moderate bleeding risk ($\approx 1.88\text{ bleeds / 100 pt-yrs}$).
  - Score $\ge 3$: High bleeding risk ($\ge 3.74\text{ bleeds / 100 pt-yrs}$; indicates need for cautious anticoagulation monitoring and correction of modifiable risks).

### 3.15 qSOFA Sepsis Screening (Quick Sepsis-Related Organ Failure Assessment)
$$\text{qSOFA Score} = \text{Altered Mentation (1)} + \text{Tachypnea (1)} + \text{Hypotension (1)}$$
- **Criteria (1 point each)**:
  - Altered mental status ($\text{GCS} < 15$)
  - Respiratory rate $\ge 22\text{ breaths/min}$
  - Systolic blood pressure $\le 100\text{ mmHg}$
- **Stratification**:
  - Score $0 - 1$: Low risk of in-hospital mortality.
  - Score $2 - 3$: High risk of poor outcome / in-hospital mortality ($\approx 3-14\times$ elevated risk); prompts immediate diagnostic workup for organ dysfunction, serum lactate measurement, blood cultures, and sepsis protocol activation.

### 3.16 CHA₂DS₂-VASc Stroke Risk Score
$$\text{CHA}_2\text{DS}_2\text{-VASc} = C + H + A_2 + D + S_2 + V + A + Sc$$
- **Components (0–9 points)**:
  - **C**ongestive heart failure: $+1$
  - **H**ypertension: $+1$
  - **A**ge $\ge 75\text{ years}$: $+2$
  - **D**iabetes mellitus: $+1$
  - **S**troke / TIA / thromboembolism history: $+2$
  - **V**ascular disease (prior MI, PAD, aortic plaque): $+1$
  - **A**ge $65 - 74\text{ years}$: $+1$
  - **S**ex **c**ategory (Female): $+1$
- **Stratification & Anticoagulation Guidelines**:
  - Score $0$ (Men) / $1$ (Women): Low risk (no antithrombotic therapy recommended).
  - Score $1$ (Men) / $2$ (Women): Moderate risk (oral anticoagulation should be considered based on clinical shared decision-making).
  - Score $\ge 2$ (Men) / $\ge 3$ (Women): High risk (oral anticoagulation with DOAC or warfarin strongly recommended).

### 3.17 Modified Centor (McIsaac) Score for Strep Pharyngitis
$$\text{Centor Score} = \text{Exudate (+1)} + \text{Tender Nodes (+1)} + \text{Fever (+1)} + \text{No Cough (+1)} + \text{Age Group (+1, 0, -1)}$$
- **Clinical Criteria (1 point each)**:
  - Tonsillar exudate or swelling: $+1$
  - Tender or swollen anterior cervical lymph nodes: $+1$
  - History of fever $> 38^\circ\text{C}$ ($100.4^\circ\text{F}$): $+1$
  - Absence of cough: $+1$
  - Age group (McIsaac criteria):
    - $3 - 14\text{ years}$: $+1$
    - $15 - 44\text{ years}$: $0$
    - $\ge 45\text{ years}$: $-1$
- **Stratification & Stewardship Guidance (IDSA/CDC)**:
  - Score $\le 1$: Low risk ($1 - 10\%$ streptococcal probability; throat culture or antibiotic typically not indicated).
  - Score $2$: Intermediate risk ($11 - 17\%$ probability; throat culture or rapid antigen test [RADT] recommended; treat only if positive).
  - Score $3$: Moderate-to-high risk ($28 - 35\%$ probability; throat culture or RADT recommended; treat only if positive).
  - Score $\ge 4$: High risk ($51 - 53\%$ probability; RADT or throat culture recommended; consider empiric antibiotic per clinical judgment).

### 3.18 HEART Score for Major Adverse Cardiac Events (MACE)
$$\text{HEART Score} = H + E + A + R + T$$
- **Five Clinical Categories (0–2 points each; total range 0–10)**:
  - **H (History)**: Slightly suspicious ($0$), Moderately suspicious ($1$), Highly suspicious ($2$).
  - **E (ECG)**: Normal ($0$), Non-specific repolarization disturbance ($1$), Significant ST deviation ($2$).
  - **A (Age)**: $< 45\text{ years}$ ($0$), $45 - 64\text{ years}$ ($1$), $\ge 65\text{ years}$ ($2$).
  - **R (Risk Factors)**: No known risk factors ($0$), $1 - 2$ risk factors ($1$), $\ge 3$ risk factors or history of atherosclerotic disease ($2$). *(Risk factors: hypertension, hypercholesterolemia, diabetes, smoking, family history of early CAD, obesity)*.
  - **T (Troponin)**: Normal / $\le$ normal limit ($0$), $1 - 3\times$ normal limit ($1$), $> 3\times$ normal limit ($2$).
- **6-Week MACE Risk Stratification**:
  - **Low Risk ($0 - 3$ points)**: $\approx 0.9 - 1.7\%$ risk of 6-week MACE; candidate for early discharge or non-invasive outpatient evaluation.
  - **Intermediate Risk ($4 - 6$ points)**: $\approx 12 - 16.6\%$ risk of 6-week MACE; observation unit admission, serial troponins, non-invasive cardiac testing.
  - **High Risk ($7 - 10$ points)**: $\approx 50 - 65\%$ risk of 6-week MACE; urgent cardiology consultation, early invasive strategy (coronary angiography), aggressive medical stabilization.

---

## 4. Developer Extensibility: Adding Calculator #22

Follow this architectural guide to add a new calculator:

```jsx
// Excerpt from frontend/src/components/tools/ClinicalCalculatorsModal.jsx
// Step 1: Add tab key to tabList array:
const tabList = [
  "bmi", "egfr", "chads", "map", "crcl", "calcium",
  "aniongap", "fena", "feurea", "fluids", "wells", "curb65",
  "gcs", "hasbled", "qsofa", "bsa", "apri", "childpugh", "meld", "centor", "heart"
];

// Step 2: Implement deterministic formula with clamping in React state:
// ...

// Step 3: Add WAI-ARIA tab button and tabpanel in JSX:
<button
  role="tab"
  id="tab-newtool"
  aria-selected={activeTab === "newtool"}
  aria-controls="panel-newtool"
  onClick={() => setActiveTab("newtool")}
>
  New Clinical Tool
</button>

<div
  role="tabpanel"
  id="panel-newtool"
  aria-labelledby="tab-newtool"
  hidden={activeTab !== "newtool"}
>
  {/* Form inputs with physiological min/max bounds */}
</div>
```

---

## 5. Automated Verification Commands

All 21 clinical calculators are verified by 19 unit tests in `frontend/src/test/clinicalCalculators.test.jsx`:

```powershell
# Run the clinical calculators test suite
npm test --prefix frontend -- clinicalCalculators.test.jsx

# Run Playwright browser tests verifying calculator tabpanel accessibility
node scripts/browser_verify_dark_and_tools.cjs
```
