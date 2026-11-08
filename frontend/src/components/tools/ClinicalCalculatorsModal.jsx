import { useState, useEffect, useId, useRef } from "react";

const PERC_CRITERIA = [
  { id: "age", label: "Age ≥ 50 years" },
  { id: "hr", label: "Heart rate ≥ 100 bpm" },
  { id: "o2", label: "Pulse oximetry SaO₂ < 95% on room air" },
  { id: "prior", label: "Previous documented DVT or PE" },
  { id: "trauma", label: "Recent trauma or surgery (past 4 weeks requiring hospitalization / general anesthesia)" },
  { id: "hemoptysis", label: "Hemoptysis (coughing up blood)" },
  { id: "estrogen", label: "Exogenous estrogen use (oral contraceptives, hormone replacement, estrogen therapy)" },
  { id: "leg", label: "Unilateral leg swelling (clinically asymmetrical edema)" },
];

const QSOFA_CRITERIA = [
  { id: "mental", label: "Altered mental status (Glasgow Coma Scale < 15)" },
  { id: "resp", label: "Respiratory rate ≥ 22 breaths/min" },
  { id: "bp", label: "Systolic blood pressure ≤ 100 mmHg" },
];

const CENTOR_CRITERIA = [
  { id: "tonsils", label: "Tonsillar exudate or swelling" },
  { id: "nodes", label: "Tender or swollen anterior cervical lymph nodes" },
  { id: "fever", label: "History of fever > 38°C (100.4°F)" },
  { id: "noCough", label: "Absence of cough" },
];

const CURB_CRITERIA = [
  { id: "confusion", label: "New confusion or AMTS ≤ 8" },
  { id: "urea", label: "Blood urea nitrogen > 19 mg/dL (urea > 7 mmol/L)" },
  { id: "respiratory", label: "Respiratory rate ≥ 30 breaths/min" },
  { id: "bp", label: "Systolic BP < 90 mmHg or diastolic BP ≤ 60 mmHg" },
  { id: "age", label: "Age ≥ 65 years" },
];

const HASBLED_CRITERIA = [
  { id: "htn", label: "Uncontrolled hypertension (systolic BP > 160 mmHg)" },
  { id: "renal", label: "Abnormal renal function (dialysis, transplant, or creatinine ≥ 2.26 mg/dL)" },
  { id: "liver", label: "Abnormal liver function (cirrhosis or abnormal bilirubin and enzymes)" },
  { id: "stroke", label: "Prior stroke" },
  { id: "bleeding", label: "Bleeding history or predisposition" },
  { id: "labileInr", label: "Labile INR on vitamin K antagonist therapy" },
  { id: "elderly", label: "Age > 65 years" },
  { id: "drugs", label: "Concomitant antiplatelet or NSAID use" },
  { id: "alcohol", label: "Alcohol excess (≥ 8 drinks per week)" },
];

const WELLS_CRITERIA = [
  { id: "dvtSymptoms", label: "Clinical signs and symptoms of DVT (leg swelling and deep vein tenderness)", points: 3 },
  { id: "peLikely", label: "An alternative diagnosis is less likely than PE", points: 3 },
  { id: "tachycardia", label: "Heart rate > 100 beats/min", points: 1.5 },
  { id: "immobilization", label: "Immobilisation for more than 3 days or surgery in the previous 4 weeks", points: 1.5 },
  { id: "priorDvtPe", label: "Previous DVT or PE", points: 1.5 },
  { id: "hemoptysis", label: "Haemoptysis (coughing up blood)", points: 1 },
  { id: "malignancy", label: "Malignancy (on treatment, treated in the last 6 months, or palliative)", points: 1 },
];

const CHADS_CRITERIA = [
  { id: "chf", label: "Heart failure or left ventricular dysfunction", points: 1 },
  { id: "htn", label: "Hypertension history or treatment", points: 1 },
  { id: "dm", label: "Diabetes mellitus", points: 1 },
  { id: "stroke", label: "Prior stroke, TIA, or thromboembolism", points: 2 },
  { id: "vascular", label: "Vascular disease (prior MI, PAD, or aortic plaque)", points: 1 },
];

const CALCULATORS = [
  ["bmi", "BMI"], ["egfr", "eGFR (CKD-EPI)"], ["chads", "CHA₂DS₂-VASc"],
  ["map", "MAP / Perfusion"], ["crcl", "CrCl (Cockcroft-Gault)"],
  ["calcium", "Corrected Calcium"], ["aniongap", "Serum Anion Gap"],
  ["fena", "FeNa (Fractional Excretion of Na)"], ["feurea", "FeUrea (on Diuretics)"],
  ["fluids", "Pediatric 4-2-1 fluid example"], ["wells", "Wells' Criteria (PE)"],
  ["curb65", "CURB-65 (Pneumonia)"], ["gcs", "GCS (Coma Scale)"],
  ["hasbled", "HAS-BLED (Bleeding Risk)"], ["qsofa", "qSOFA (Sepsis Screening)"],
  ["bsa", "BSA (Mosteller)"], ["apri", "APRI (Liver Fibrosis)"],
  ["childpugh", "Child-Pugh (Cirrhosis)"], ["meld", "MELD-Na (Liver Disease)"],
  ["centor", "Centor (Strep Throat)"], ["heart", "HEART (Chest Pain)"],
  ["perc", "PERC (PE Rule-Out)"],
];

export default function ClinicalCalculatorsModal({ isOpen, onClose, onInsertPrompt }) {
  const [activeTab, setActiveTab] = useState("bmi");
  const [copied, setCopied] = useState(false);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) document.getElementById(`tab-${activeTab}`)?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onCloseRef.current(); return; }
      const tabList = CALCULATORS.map(([id]) => id);
      const activeEl = document.activeElement;
      if (activeEl && activeEl.getAttribute("role") === "tab") {
        const curTabId = activeEl.id.replace(/^tab-/, "");
        const curIndex = tabList.indexOf(curTabId);
        if (curIndex !== -1) {
          let nextIndex = -1;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            nextIndex = (curIndex + 1) % tabList.length;
          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            nextIndex = (curIndex - 1 + tabList.length) % tabList.length;
          } else if (e.key === "Home") {
            nextIndex = 0;
          } else if (e.key === "End") {
            nextIndex = tabList.length - 1;
          }
          if (nextIndex !== -1) {
            e.preventDefault();
            const nextTab = tabList[nextIndex];
            setActiveTab(nextTab);
            document.getElementById("tab-" + nextTab)?.focus();
            return;
          }
        }
      }
      if (e.key !== "Tab") return;
      const focusable = [...modalRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]')].filter((item) => item.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!modalRef.current.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); previousFocus?.focus(); };
  }, [isOpen]);

  // BMI State
  const [bmiUnit, setBmiUnit] = useState("metric"); // metric | imperial
  const [weightKg, setWeightKg] = useState("70");
  const [heightCm, setHeightCm] = useState("175");
  const [weightLbs, setWeightLbs] = useState("154");
  const [heightIn, setHeightIn] = useState("69");

  // eGFR State
  const [egfrAge, setEgfrAge] = useState("55");
  const [egfrSex, setEgfrSex] = useState("female"); // female | male
  const [egfrScr, setEgfrScr] = useState("1.1"); // mg/dL

  // CHA2DS2-VASc State
  const [chadsCriteria, setChadsCriteria] = useState({});
  const [chadsAgeGroup, setChadsAgeGroup] = useState("unknown"); // under65 | 65to74 | 75plus
  const [chadsSex, setChadsSex] = useState("unknown"); // female | male

  // MAP State
  const [mapSbp, setMapSbp] = useState("120");
  const [mapDbp, setMapDbp] = useState("80");

  // CrCl (Cockcroft-Gault) State
  const [crclAge, setCrclAge] = useState("65");
  const [crclSex, setCrclSex] = useState("male");
  const [crclWeightKg, setCrclWeightKg] = useState("75");
  const [crclScr, setCrclScr] = useState("1.2");

  // Corrected Calcium State
  const [serumCalcium, setSerumCalcium] = useState("8.0"); // mg/dL
  const [serumAlbumin, setSerumAlbumin] = useState("2.5"); // g/dL

  // Serum Anion Gap State
  const [agSodium, setAgSodium] = useState("140"); // mEq/L
  const [agChloride, setAgChloride] = useState("104"); // mEq/L
  const [agBicarbonate, setAgBicarbonate] = useState("24"); // mEq/L

  // FeNa State
  const [fenaSerumNa, setFenaSerumNa] = useState("140"); // mEq/L
  const [fenaSerumCr, setFenaSerumCr] = useState("2.0"); // mg/dL
  const [fenaUrineNa, setFenaUrineNa] = useState("15"); // mEq/L
  const [fenaUrineCr, setFenaUrineCr] = useState("100"); // mg/dL

  // FeUrea State
  const [feureaBun, setFeureaBun] = useState("40"); // mg/dL
  const [feureaScr, setFeureaScr] = useState("2.0"); // mg/dL
  const [feureaUrineUrea, setFeureaUrineUrea] = useState("500"); // mg/dL
  const [feureaUrineCr, setFeureaUrineCr] = useState("100"); // mg/dL

  // Maintenance Fluids State
  const [fluidWeightKg, setFluidWeightKg] = useState("20");

  // Wells' Criteria for PE State
  const [wellsCriteria, setWellsCriteria] = useState({});

  // CURB-65 State
  const [curbCriteria, setCurbCriteria] = useState({});

  // GCS (Glasgow Coma Scale) State
  const [gcsEye, setGcsEye] = useState("unknown");
  const [gcsVerbal, setGcsVerbal] = useState("unknown");
  const [gcsMotor, setGcsMotor] = useState("unknown");

  // HAS-BLED State
  const [hasbledCriteria, setHasbledCriteria] = useState({});

  // qSOFA State
  const [qsofaCriteria, setQsofaCriteria] = useState({});

  // BSA (Body Surface Area - Mosteller) State
  const [bsaUnit, setBsaUnit] = useState("metric"); // metric | imperial
  const [bsaHeightCm, setBsaHeightCm] = useState("175");
  const [bsaWeightKg, setBsaWeightKg] = useState("70");
  const [bsaHeightIn, setBsaHeightIn] = useState("69");
  const [bsaWeightLbs, setBsaWeightLbs] = useState("154");

  // APRI (AST to Platelet Ratio Index) State
  const [apriAst, setApriAst] = useState(""); // U/L
  const [apriAstUln, setApriAstUln] = useState(""); // U/L
  const [apriPlatelets, setApriPlatelets] = useState(""); // 10^9/L or x10^3/uL

  // Child-Pugh Score State
  const [cpBilirubin, setCpBilirubin] = useState(""); // mg/dL
  const [cpAlbumin, setCpAlbumin] = useState(""); // g/dL
  const [cpInr, setCpInr] = useState("");
  const [cpAscites, setCpAscites] = useState("unknown"); // unknown | none | mild | moderate
  const [cpEncephalopathy, setCpEncephalopathy] = useState("unknown"); // unknown | none | grade1_2 | grade3_4

  // MELD-Na Score State
  const [meldBilirubin, setMeldBilirubin] = useState(""); // mg/dL
  const [meldCreatinine, setMeldCreatinine] = useState(""); // mg/dL
  const [meldInr, setMeldInr] = useState("");
  const [meldSodium, setMeldSodium] = useState(""); // mEq/L
  const [meldDialysis, setMeldDialysis] = useState("unknown"); // unknown | no | yes

  // Modified Centor / McIsaac Score State
  const [centorCriteria, setCentorCriteria] = useState({});
  const [centorAgeGroup, setCentorAgeGroup] = useState("unknown");

  // HEART Score State
  const [heartHistory, setHeartHistory] = useState("unknown");
  const [heartEcg, setHeartEcg] = useState("unknown");
  const [heartAge, setHeartAge] = useState("unknown");
  const [heartRisk, setHeartRisk] = useState("unknown");
  const [heartTroponin, setHeartTroponin] = useState("unknown");

  // A missing answer must never be treated as an absent clinical criterion.
  const [percCriteria, setPercCriteria] = useState({});

  const titleId = useId();

  if (!isOpen) return null;

  // 1. BMI Calculation
  let bmiVal = null;
  let bmiCategory = "";
  if (bmiUnit === "metric") {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm) / 100;
    if (w >= 10 && w <= 400 && h >= 0.5 && h <= 2.5) {
      bmiVal = (w / (h * h)).toFixed(1);
    }
  } else {
    const w = parseFloat(weightLbs);
    const h = parseFloat(heightIn);
    if (w >= 20 && w <= 900 && h >= 20 && h <= 100) {
      bmiVal = ((703 * w) / (h * h)).toFixed(1);
    }
  }

  if (bmiVal !== null) {
    const num = parseFloat(bmiVal);
    if (num < 18.5) bmiCategory = "Underweight";
    else if (num < 25.0) bmiCategory = "Normal weight";
    else if (num < 30.0) bmiCategory = "Overweight";
    else if (num < 35.0) bmiCategory = "Class I Obesity";
    else if (num < 40.0) bmiCategory = "Class II Obesity";
    else bmiCategory = "Class III Obesity (Severe)";
  }

  // 2. eGFR (CKD-EPI 2021)
  let egfrVal = null;
  let egfrCategory = "";
  const scr = parseFloat(egfrScr);
  const age = parseFloat(egfrAge);
  if (scr >= 0.2 && scr <= 15 && age >= 18 && age <= 120) {
    const isFemale = egfrSex === "female";
    const kappa = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.241 : -0.302;
    const minRatio = Math.min(scr / kappa, 1);
    const maxRatio = Math.max(scr / kappa, 1);
    const sexFactor = isFemale ? 1.012 : 1.0;
    const calc = 142 * Math.pow(minRatio, alpha) * Math.pow(maxRatio, -1.2) * Math.pow(0.9938, age) * sexFactor;
    egfrVal = Math.round(calc);

    if (egfrVal >= 90) egfrCategory = "GFR category G1";
    else if (egfrVal >= 60) egfrCategory = "GFR category G2";
    else if (egfrVal >= 45) egfrCategory = "GFR category G3a";
    else if (egfrVal >= 30) egfrCategory = "GFR category G3b";
    else if (egfrVal >= 15) egfrCategory = "GFR category G4";
    else egfrCategory = "GFR category G5";
  }

  // 3. CHA2DS2-VASc
  const chadsAssessed = CHADS_CRITERIA.filter(({ id }) => chadsCriteria[id] === "present" || chadsCriteria[id] === "absent").length
    + (chadsAgeGroup !== "unknown" ? 1 : 0) + (chadsSex !== "unknown" ? 1 : 0);
  const chadsComplete = chadsAssessed === 7;
  const chadsScore = CHADS_CRITERIA.reduce((sum, { id, points }) => sum + (chadsCriteria[id] === "present" ? points : 0), 0)
    + (chadsAgeGroup === "75plus" ? 2 : chadsAgeGroup === "65to74" ? 1 : 0)
    + (chadsSex === "female" ? 1 : 0);

  // 4. MAP
  let mapVal = null;
  let pulsePressure = null;
  const sbp = parseFloat(mapSbp);
  const dbp = parseFloat(mapDbp);
  if (sbp >= 50 && sbp <= 280 && dbp >= 20 && dbp <= 180 && sbp > dbp) {
    mapVal = Math.round((sbp + 2 * dbp) / 3);
    pulsePressure = Math.round(sbp - dbp);
  }

  // 5. CrCl (Cockcroft-Gault)
  let crclVal = null;
  const cAge = parseFloat(crclAge);
  const cWt = parseFloat(crclWeightKg);
  const cScr = parseFloat(crclScr);
  if (cAge >= 18 && cAge <= 120 && cWt >= 20 && cWt <= 350 && cScr >= 0.2 && cScr <= 15) {
    const rawCrcl = (((140 - cAge) * cWt) / (72 * cScr)) * (crclSex === "female" ? 0.85 : 1.0);
    crclVal = Math.round(rawCrcl);
  }

  // 6. Corrected Calcium (Payne formula)
  let correctedCaVal = null;
  let caClassification = "";
  const ca = parseFloat(serumCalcium);
  const alb = parseFloat(serumAlbumin);
  if (ca >= 4.0 && ca <= 20.0 && alb >= 1.0 && alb <= 6.0) {
    const rawVal = ca + 0.8 * (4.0 - alb);
    correctedCaVal = parseFloat(rawVal.toFixed(2));
    if (correctedCaVal < 8.5) caClassification = "Below typical reference (< 8.5 mg/dL)";
    else if (correctedCaVal <= 10.5) caClassification = "Typical reference (8.5–10.5 mg/dL)";
    else caClassification = "Above typical reference (> 10.5 mg/dL)";
  }

  // 7. Serum Anion Gap
  let anionGapVal = null;
  let anionGapCategory = "";
  const na = parseFloat(agSodium);
  const cl = parseFloat(agChloride);
  const hco3 = parseFloat(agBicarbonate);
  if (na >= 100 && na <= 180 && cl >= 60 && cl <= 140 && hco3 >= 5 && hco3 <= 50) {
    anionGapVal = Math.round(na - (cl + hco3));
    if (anionGapVal < 8) anionGapCategory = "Low anion gap (< 8 mEq/L)";
    else if (anionGapVal <= 12) anionGapCategory = "Typical reference range (8–12 mEq/L)";
    else anionGapCategory = "Elevated anion gap (> 12 mEq/L)";
  }

  // 8. Fractional Excretion of Sodium (FeNa)
  let fenaVal = null;
  let fenaCategory = "";
  const sNa = parseFloat(fenaSerumNa);
  const sCr = parseFloat(fenaSerumCr);
  const uNa = parseFloat(fenaUrineNa);
  const uCr = parseFloat(fenaUrineCr);
  if (
    sNa >= 100 && sNa <= 180 &&
    sCr >= 0.2 && sCr <= 20.0 &&
    uNa >= 1 && uNa <= 250 &&
    uCr >= 10 && uCr <= 500
  ) {
    const rawFena = ((uNa * sCr) / (sNa * uCr)) * 100;
    fenaVal = parseFloat(rawFena.toFixed(2));
    if (fenaVal < 1.0) fenaCategory = "Below 1%";
    else if (fenaVal <= 2.0) fenaCategory = "1%–2%";
    else fenaCategory = "Above 2%";
  }

  // 9. Fractional Excretion of Urea (FeUrea)
  let feureaVal = null;
  let feureaCategory = "";
  const uBun = parseFloat(feureaBun);
  const uScr = parseFloat(feureaScr);
  const uUrea = parseFloat(feureaUrineUrea);
  const uCrVal = parseFloat(feureaUrineCr);
  if (
    uBun >= 5 && uBun <= 200 &&
    uScr >= 0.2 && uScr <= 20.0 &&
    uUrea >= 50 && uUrea <= 3000 &&
    uCrVal >= 10 && uCrVal <= 500
  ) {
    const rawFeurea = ((uUrea * uScr) / (uBun * uCrVal)) * 100;
    feureaVal = parseFloat(rawFeurea.toFixed(1));
    if (feureaVal < 35.0) feureaCategory = "Below 35%";
    else if (feureaVal <= 50.0) feureaCategory = "35%–50%";
    else feureaCategory = "Above 50%";
  }

  // 10. Maintenance Fluids (Holliday-Segar 4-2-1 Rule)
  let fluidHourlyRate = null;
  let fluidDailyVolume = null;
  const fWt = parseFloat(fluidWeightKg);
  if (fWt >= 1.0 && fWt <= 100.0) {
    if (fWt <= 10.0) {
      fluidHourlyRate = Math.round(fWt * 4);
    } else if (fWt <= 20.0) {
      fluidHourlyRate = Math.round(10 * 4 + (fWt - 10) * 2);
    } else {
      fluidHourlyRate = Math.round(10 * 4 + 10 * 2 + (fWt - 20) * 1);
    }
    fluidDailyVolume = fluidHourlyRate * 24;
  }

  // 11. Wells' Criteria for PE
  const wellsAssessed = WELLS_CRITERIA.filter(({ id }) => wellsCriteria[id] === "present" || wellsCriteria[id] === "absent").length;
  const wellsComplete = wellsAssessed === WELLS_CRITERIA.length;
  const wellsScore = WELLS_CRITERIA.reduce((sum, { id, points }) => sum + (wellsCriteria[id] === "present" ? points : 0), 0);
  const wellsFormatted = Number.isInteger(wellsScore) ? String(wellsScore) : wellsScore.toFixed(1);
  const wellsScoreBand = wellsScore <= 4.0 ? "NICE score band: 4 or less" : "NICE score band: above 4";

  // 12. CURB-65 Pneumonia Severity Score
  const curbAssessed = CURB_CRITERIA.filter(({ id }) => curbCriteria[id] === "present" || curbCriteria[id] === "absent").length;
  const curbComplete = curbAssessed === CURB_CRITERIA.length;
  const curbScore = CURB_CRITERIA.filter(({ id }) => curbCriteria[id] === "present").length;
  const curbScoreBand = curbScore <= 1 ? "0–1 point band" : curbScore === 2 ? "2 point band" : "3–5 point band";

  // 13. Glasgow Coma Scale (GCS)
  const gcsResponses = [gcsEye, gcsVerbal, gcsMotor];
  const gcsAssessed = gcsResponses.filter((value) => /^\d$/.test(value)).length;
  const gcsNotTestable = gcsResponses.includes("not_testable");
  const gcsComplete = gcsAssessed === 3;
  const gcsScore = gcsComplete ? gcsResponses.reduce((sum, value) => sum + Number(value), 0) : null;
  const gcsScoreBand = !gcsComplete ? "" : gcsScore <= 8 ? "3–8 point band" : gcsScore <= 12 ? "9–12 point band" : "13–15 point band";

  // 14. HAS-BLED Bleeding Risk Score
  const hasbledAssessed = HASBLED_CRITERIA.filter(({ id }) =>
    hasbledCriteria[id] === "present" || hasbledCriteria[id] === "absent" || (id === "labileInr" && hasbledCriteria[id] === "not_applicable")
  ).length;
  const hasbledComplete = hasbledAssessed === HASBLED_CRITERIA.length;
  const hasbledScore = HASBLED_CRITERIA.filter(({ id }) => hasbledCriteria[id] === "present").length;
  const hasbledScoreBand = hasbledScore <= 1 ? "0–1 point band" : hasbledScore === 2 ? "2 point band" : "3–9 point band";

  // 15. qSOFA (Quick Sepsis-related Organ Failure Assessment)
  const qsofaAssessed = QSOFA_CRITERIA.filter(({ id }) => qsofaCriteria[id] === "present" || qsofaCriteria[id] === "absent").length;
  const qsofaComplete = qsofaAssessed === QSOFA_CRITERIA.length;
  const qsofaScore = QSOFA_CRITERIA.filter(({ id }) => qsofaCriteria[id] === "present").length;

  // 16. Mosteller Body Surface Area (BSA)
  let bsaVal = null;
  if (bsaUnit === "metric") {
    const h = parseFloat(bsaHeightCm);
    const w = parseFloat(bsaWeightKg);
    if (h >= 30 && h <= 250 && w >= 2 && w <= 350) {
      bsaVal = Math.sqrt((h * w) / 3600).toFixed(2);
    }
  } else {
    const h = parseFloat(bsaHeightIn);
    const w = parseFloat(bsaWeightLbs);
    if (h >= 12 && h <= 100 && w >= 5 && w <= 800) {
      bsaVal = Math.sqrt((h * w) / 3131).toFixed(2);
    }
  }

  // 17. AST to Platelet Ratio Index (APRI)
  let apriVal = null;
  const ast = parseFloat(apriAst);
  const astUln = parseFloat(apriAstUln);
  const platelets = parseFloat(apriPlatelets);
  if (ast >= 5 && ast <= 2000 && astUln >= 10 && astUln <= 100 && platelets >= 10 && platelets <= 1000) {
    const calc = ((ast / astUln) / platelets) * 100;
    apriVal = calc.toFixed(2);
  }

  // 18. Child-Pugh cirrhosis classification
  let cpScore = null;
  let cpClass = "";
  const cpBiliNum = parseFloat(cpBilirubin);
  const cpAlbNum = parseFloat(cpAlbumin);
  const cpInrNum = parseFloat(cpInr);

  if (
    !isNaN(cpBiliNum) && cpBiliNum >= 0.1 && cpBiliNum <= 50 &&
    !isNaN(cpAlbNum) && cpAlbNum >= 0.5 && cpAlbNum <= 6.0 &&
    !isNaN(cpInrNum) && cpInrNum >= 0.5 && cpInrNum <= 10.0 &&
    cpAscites !== "unknown" && cpEncephalopathy !== "unknown"
  ) {
    let points = 0;
    // Bilirubin points (<2.0: 1, 2.0-3.0: 2, >3.0: 3)
    if (cpBiliNum < 2.0) points += 1;
    else if (cpBiliNum <= 3.0) points += 2;
    else points += 3;

    // Albumin points (>3.5: 1, 2.8-3.5: 2, <2.8: 3)
    if (cpAlbNum > 3.5) points += 1;
    else if (cpAlbNum >= 2.8) points += 2;
    else points += 3;

    // INR points (<1.7: 1, 1.7-2.3: 2, >2.3: 3)
    if (cpInrNum < 1.7) points += 1;
    else if (cpInrNum <= 2.3) points += 2;
    else points += 3;

    // Ascites points
    if (cpAscites === "none") points += 1;
    else if (cpAscites === "mild") points += 2;
    else points += 3;

    // Encephalopathy points
    if (cpEncephalopathy === "none") points += 1;
    else if (cpEncephalopathy === "grade1_2") points += 2;
    else points += 3;

    cpScore = points;
    if (cpScore <= 6) {
      cpClass = "Class A (5–6 points)";
    } else if (cpScore <= 9) {
      cpClass = "Class B (7–9 points)";
    } else {
      cpClass = "Class C (10–15 points)";
    }
  }

  // 19. Historical 2016 MELD-Na equation (not the current OPTN allocation formula)
  let meldScore = null;
  let meldBand = "";
  const meldBiliNum = parseFloat(meldBilirubin);
  const meldCrNum = parseFloat(meldCreatinine);
  const meldInrNum = parseFloat(meldInr);
  const meldNaNum = parseFloat(meldSodium);

  if (
    !isNaN(meldBiliNum) && meldBiliNum >= 0.1 && meldBiliNum <= 50.0 &&
    (meldDialysis === "yes" || (!isNaN(meldCrNum) && meldCrNum >= 0.1 && meldCrNum <= 15.0)) &&
    !isNaN(meldInrNum) && meldInrNum >= 0.5 && meldInrNum <= 10.0 &&
    !isNaN(meldNaNum) && meldNaNum >= 100 && meldNaNum <= 160 &&
    meldDialysis !== "unknown"
  ) {
    const crCalc = meldDialysis === "yes" ? 4.0 : Math.max(1.0, Math.min(4.0, meldCrNum));
    const biliCalc = Math.max(1.0, meldBiliNum);
    const inrCalc = Math.max(1.0, meldInrNum);

    const meldInitial = 9.57 * Math.log(crCalc) + 3.78 * Math.log(biliCalc) + 11.2 * Math.log(inrCalc) + 6.43;
    const meldInitialRound = Math.round(meldInitial);

    let calculatedMeld = meldInitialRound;
    if (meldInitialRound > 11) {
      const naCalc = Math.max(125, Math.min(137, meldNaNum));
      const meldNa = meldInitialRound + 1.32 * (137 - naCalc) - (0.033 * meldInitialRound * (137 - naCalc));
      calculatedMeld = Math.round(meldNa);
    }

    meldScore = Math.max(6, Math.min(40, calculatedMeld));

    meldBand = meldScore <= 9 ? "6–9 point band" : meldScore <= 19 ? "10–19 point band" : meldScore <= 29 ? "20–29 point band" : meldScore <= 39 ? "30–39 point band" : "40 point band";
  }

  // 20. Modified Centor (McIsaac) Score for Pharyngitis
  const centorAssessed = CENTOR_CRITERIA.filter(({ id }) => centorCriteria[id] === "present" || centorCriteria[id] === "absent").length + (centorAgeGroup === "unknown" ? 0 : 1);
  const centorComplete = centorAssessed === 5;
  let centorScore = CENTOR_CRITERIA.filter(({ id }) => centorCriteria[id] === "present").length;
  if (centorAgeGroup === "3to14") centorScore += 1;
  else if (centorAgeGroup === "45plus") centorScore -= 1;

  const centorStratification = centorScore <= 1 ? "−1 to 1 point band" : centorScore === 2 ? "2 point band" : centorScore === 3 ? "3 point band" : "4 to 5 point band";

  // 21. HEART Score for Major Adverse Cardiac Events (MACE)
  const heartAssessed = [heartHistory, heartEcg, heartAge, heartRisk, heartTroponin].filter((value) => value !== "unknown").length;
  const heartComplete = heartAssessed === 5;
  let heartScore = 0;
  if (heartHistory === "moderate") heartScore += 1;
  else if (heartHistory === "highly") heartScore += 2;

  if (heartEcg === "nonspecific") heartScore += 1;
  else if (heartEcg === "st_deviation") heartScore += 2;

  if (heartAge === "45to64") heartScore += 1;
  else if (heartAge === "65plus") heartScore += 2;

  if (heartRisk === "one_two") heartScore += 1;
  else if (heartRisk === "three_plus") heartScore += 2;

  if (heartTroponin === "one_to_three") heartScore += 1;
  else if (heartTroponin === "greater_three") heartScore += 2;

  let heartStratification = "";
  if (heartScore <= 3) {
    heartStratification = "0–3 point band";
  } else if (heartScore <= 6) {
    heartStratification = "4–6 point band";
  } else {
    heartStratification = "7–10 point band";
  }

  // 22. PERC Rule for Pulmonary Embolism Rule-out
  const percAssessed = PERC_CRITERIA.filter(({ id }) => percCriteria[id] === "present" || percCriteria[id] === "absent").length;
  const percComplete = percAssessed === PERC_CRITERIA.length;
  const percScore = PERC_CRITERIA.filter(({ id }) => percCriteria[id] === "present").length;

  // Handlers
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const insertAndClose = (promptText) => {
    if (onInsertPrompt) onInsertPrompt(promptText);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className="modal-card clinical-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row-between modal-header">
          <div>
            <span className="eyebrow">EDUCATIONAL REFERENCE TOOLS</span>
            <h2 id={titleId} style={{ margin: 0 }}>Health calculators</h2>
          </div>
          <button type="button" className="text-button" ref={closeButtonRef} onClick={onClose} aria-label="Close dialog">
            ✕ Close
          </button>
        </div>

        <p className="muted small-text">Educational estimates only. Age ranges vary by tool; check the description for each one. These values cannot diagnose a condition or determine treatment. Confirm measurements and interpretation with a qualified clinician.</p>
        <label className="calc-jump" htmlFor="calc-jump-select">
          Jump to calculator
          <select id="calc-jump-select" value={activeTab} onChange={(e) => setActiveTab(e.target.value)}>
            {CALCULATORS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <div className="calc-tabs" role="tablist" aria-label="Clinical calculator selector">
          <button
            type="button"
            role="tab"
            id="tab-bmi"
            aria-selected={activeTab === "bmi"}
            aria-controls="tabpanel-bmi"
            className={`calc-tab ${activeTab === "bmi" ? "active" : ""}`}
            onClick={() => setActiveTab("bmi")}
          >
            BMI
          </button>
          <button
            type="button"
            role="tab"
            id="tab-egfr"
            aria-selected={activeTab === "egfr"}
            aria-controls="tabpanel-egfr"
            className={`calc-tab ${activeTab === "egfr" ? "active" : ""}`}
            onClick={() => setActiveTab("egfr")}
          >
            eGFR (CKD-EPI)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-chads"
            aria-selected={activeTab === "chads"}
            aria-controls="tabpanel-chads"
            className={`calc-tab ${activeTab === "chads" ? "active" : ""}`}
            onClick={() => setActiveTab("chads")}
          >
            CHA₂DS₂-VASc
          </button>
          <button
            type="button"
            role="tab"
            id="tab-map"
            aria-selected={activeTab === "map"}
            aria-controls="tabpanel-map"
            className={`calc-tab ${activeTab === "map" ? "active" : ""}`}
            onClick={() => setActiveTab("map")}
          >
            MAP / Perfusion
          </button>
          <button
            type="button"
            role="tab"
            id="tab-crcl"
            aria-selected={activeTab === "crcl"}
            aria-controls="tabpanel-crcl"
            className={`calc-tab ${activeTab === "crcl" ? "active" : ""}`}
            onClick={() => setActiveTab("crcl")}
          >
            CrCl (Cockcroft-Gault)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-calcium"
            aria-selected={activeTab === "calcium"}
            aria-controls="tabpanel-calcium"
            className={`calc-tab ${activeTab === "calcium" ? "active" : ""}`}
            onClick={() => setActiveTab("calcium")}
          >
            Corrected Calcium
          </button>
          <button
            type="button"
            role="tab"
            id="tab-aniongap"
            aria-selected={activeTab === "aniongap"}
            aria-controls="tabpanel-aniongap"
            className={`calc-tab ${activeTab === "aniongap" ? "active" : ""}`}
            onClick={() => setActiveTab("aniongap")}
          >
            Serum Anion Gap
          </button>
          <button
            type="button"
            role="tab"
            id="tab-fena"
            aria-selected={activeTab === "fena"}
            aria-controls="tabpanel-fena"
            className={`calc-tab ${activeTab === "fena" ? "active" : ""}`}
            onClick={() => setActiveTab("fena")}
          >
            FeNa (Fractional Excretion of Na)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-feurea"
            aria-selected={activeTab === "feurea"}
            aria-controls="tabpanel-feurea"
            className={`calc-tab ${activeTab === "feurea" ? "active" : ""}`}
            onClick={() => setActiveTab("feurea")}
          >
            FeUrea (on Diuretics)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-fluids"
            aria-selected={activeTab === "fluids"}
            aria-controls="tabpanel-fluids"
            className={`calc-tab ${activeTab === "fluids" ? "active" : ""}`}
            onClick={() => setActiveTab("fluids")}
          >
            Pediatric 4-2-1 fluid example
          </button>
          <button
            type="button"
            role="tab"
            id="tab-wells"
            aria-selected={activeTab === "wells"}
            aria-controls="tabpanel-wells"
            className={`calc-tab ${activeTab === "wells" ? "active" : ""}`}
            onClick={() => setActiveTab("wells")}
          >
            Wells&apos; Criteria (PE)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-curb65"
            aria-selected={activeTab === "curb65"}
            aria-controls="tabpanel-curb65"
            className={`calc-tab ${activeTab === "curb65" ? "active" : ""}`}
            onClick={() => setActiveTab("curb65")}
          >
            CURB-65 (Pneumonia)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-gcs"
            aria-selected={activeTab === "gcs"}
            aria-controls="tabpanel-gcs"
            className={`calc-tab ${activeTab === "gcs" ? "active" : ""}`}
            onClick={() => setActiveTab("gcs")}
          >
            GCS (Coma Scale)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-hasbled"
            aria-selected={activeTab === "hasbled"}
            aria-controls="tabpanel-hasbled"
            className={`calc-tab ${activeTab === "hasbled" ? "active" : ""}`}
            onClick={() => setActiveTab("hasbled")}
          >
            HAS-BLED (Bleeding Risk)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-qsofa"
            aria-selected={activeTab === "qsofa"}
            aria-controls="tabpanel-qsofa"
            className={`calc-tab ${activeTab === "qsofa" ? "active" : ""}`}
            onClick={() => setActiveTab("qsofa")}
          >
            qSOFA (Sepsis Screening)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-bsa"
            aria-selected={activeTab === "bsa"}
            aria-controls="tabpanel-bsa"
            className={`calc-tab ${activeTab === "bsa" ? "active" : ""}`}
            onClick={() => setActiveTab("bsa")}
          >
            BSA (Mosteller)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-apri"
            aria-selected={activeTab === "apri"}
            aria-controls="tabpanel-apri"
            className={`calc-tab ${activeTab === "apri" ? "active" : ""}`}
            onClick={() => setActiveTab("apri")}
          >
            APRI (Liver Fibrosis)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-childpugh"
            aria-selected={activeTab === "childpugh"}
            aria-controls="tabpanel-childpugh"
            className={`calc-tab ${activeTab === "childpugh" ? "active" : ""}`}
            onClick={() => setActiveTab("childpugh")}
          >
            Child-Pugh (Cirrhosis)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-meld"
            aria-selected={activeTab === "meld"}
            aria-controls="tabpanel-meld"
            className={`calc-tab ${activeTab === "meld" ? "active" : ""}`}
            onClick={() => setActiveTab("meld")}
          >
            MELD-Na (Liver Disease)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-centor"
            aria-selected={activeTab === "centor"}
            aria-controls="tabpanel-centor"
            className={`calc-tab ${activeTab === "centor" ? "active" : ""}`}
            onClick={() => setActiveTab("centor")}
          >
            Centor (Strep Throat)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-heart"
            aria-selected={activeTab === "heart"}
            aria-controls="tabpanel-heart"
            className={`calc-tab ${activeTab === "heart" ? "active" : ""}`}
            onClick={() => setActiveTab("heart")}
          >
            HEART (Chest Pain)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-perc"
            aria-selected={activeTab === "perc"}
            aria-controls="tabpanel-perc"
            className={`calc-tab ${activeTab === "perc" ? "active" : ""}`}
            onClick={() => setActiveTab("perc")}
          >
            PERC (PE Rule-Out)
          </button>
        </div>

        <div className="calc-body">
          {/* TAB 1: BMI */}
          {activeTab === "bmi" && (
            <div id="tabpanel-bmi" role="tabpanel" aria-labelledby="tab-bmi" className="calc-pane">
              <div className="calc-unit-toggle">
                <button
                  type="button"
                  className={`button small ${bmiUnit === "metric" ? "" : "secondary"}`}
                  onClick={() => setBmiUnit("metric")}
                >
                  Metric (kg / cm)
                </button>
                <button
                  type="button"
                  className={`button small ${bmiUnit === "imperial" ? "" : "secondary"}`}
                  onClick={() => setBmiUnit("imperial")}
                >
                  Imperial (lb / in)
                </button>
              </div>

              {bmiUnit === "metric" ? (
                <div className="settings-grid">
                  <label>
                    Weight (kg)
                    <input
                      type="number"
                      step="0.5"
                      min="10"
                      max="400"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                    />
                  </label>
                  <label>
                    Height (cm)
                    <input
                      type="number"
                      step="1"
                      min="50"
                      max="250"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                    />
                  </label>
                </div>
              ) : (
                <div className="settings-grid">
                  <label>
                    Weight (lbs)
                    <input
                      type="number"
                      step="1"
                      min="20"
                      max="900"
                      value={weightLbs}
                      onChange={(e) => setWeightLbs(e.target.value)}
                    />
                  </label>
                  <label>
                    Height (inches)
                    <input
                      type="number"
                      step="0.5"
                      min="20"
                      max="100"
                      value={heightIn}
                      onChange={(e) => setHeightIn(e.target.value)}
                    />
                  </label>
                </div>
              )}

              {bmiVal && (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>{bmiVal} kg/m²</strong>
                    <span className="badge">{bmiCategory}</span>
                  </div>
                  <p className="small-text muted">
                    Adult BMI category only. BMI does not describe body composition or establish a diagnosis.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain adult BMI ${bmiVal} kg/m² (${bmiCategory}), its limitations, and what questions to discuss with a clinician.`
                        )
                      }
                    >
                      Ask MedAssist about this BMI
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => handleCopy(`BMI: ${bmiVal} kg/m² (${bmiCategory})`)}
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: eGFR */}
          {activeTab === "egfr" && (
            <div id="tabpanel-egfr" role="tabpanel" aria-labelledby="tab-egfr" className="calc-pane">
              <p className="small-text muted">
                2021 CKD-EPI creatinine equation without race variable (National Kidney Foundation &amp; ASN recommendation).
              </p>
              <div className="settings-grid">
                <label>
                  Biological Sex
                  <select value={egfrSex} onChange={(e) => setEgfrSex(e.target.value)}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </label>
                <label>
                  Age (years)
                  <input
                    type="number"
                    min="18"
                    max="120"
                    value={egfrAge}
                    onChange={(e) => setEgfrAge(e.target.value)}
                  />
                </label>
                <label>
                  Serum Creatinine (mg/dL)
                  <input
                    type="number"
                    step="0.05"
                    min="0.2"
                    max="15.0"
                    value={egfrScr}
                    onChange={(e) => setEgfrScr(e.target.value)}
                  />
                </label>
              </div>

              {egfrVal !== null && (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>{egfrVal} mL/min/1.73 m²</strong>
                    <span className="badge">{egfrCategory}</span>
                  </div>
                  <p className="small-text muted">
                    A single eGFR does not diagnose chronic kidney disease. Duration, urine albumin, and clinical context matter. <a href="https://www.kidney.org/what-criteria-ckd" target="_blank" rel="noopener noreferrer">NKF criteria</a>.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain eGFR ${egfrVal} mL/min/1.73m² (${egfrCategory}), why one result is not a CKD diagnosis, and what additional tests a clinician may consider.`
                        )
                      }
                    >
                      Ask MedAssist about this eGFR
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() =>
                        handleCopy(`eGFR estimate: ${egfrVal} mL/min/1.73 m² (${egfrCategory}) [2021 CKD-EPI equation; not a diagnosis]`)
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHA2DS2-VASc */}
          {activeTab === "chads" && (
            <div id="tabpanel-chads" role="tabpanel" aria-labelledby="tab-chads" className="calc-pane">
              <p className="small-text muted">
                CHA₂DS₂-VASc records factors used in clinician-confirmed atrial fibrillation risk discussions. Select each finding explicitly. This count alone does not estimate a person&apos;s annual stroke risk or determine medication.
              </p>
              <div className="settings-grid">
                {CHADS_CRITERIA.map(({ id, label, points }) => (
                  <label htmlFor={`chads-${id}-select`} key={id}>
                    {label} (+{points})
                    <select
                      id={`chads-${id}-select`}
                      value={chadsCriteria[id] || "unknown"}
                      onChange={(e) => setChadsCriteria((current) => ({ ...current, [id]: e.target.value }))}
                    >
                      <option value="unknown">Not assessed</option>
                      <option value="absent">Absent</option>
                      <option value="present">Present</option>
                    </select>
                  </label>
                ))}
                <label htmlFor="chads-age-select">
                  Age category
                  <select id="chads-age-select" value={chadsAgeGroup} onChange={(e) => setChadsAgeGroup(e.target.value)}>
                    <option value="unknown">Not assessed</option>
                    <option value="under65">&lt; 65 years (+0)</option>
                    <option value="65to74">65–74 years (+1)</option>
                    <option value="75plus">≥ 75 years (+2)</option>
                  </select>
                </label>
                <label htmlFor="chads-sex-select">
                  Sex category used by this score
                  <select id="chads-sex-select" value={chadsSex} onChange={(e) => setChadsSex(e.target.value)}>
                    <option value="unknown">Not assessed</option>
                    <option value="female">Female (+1)</option>
                    <option value="male">Male (+0)</option>
                  </select>
                </label>
              </div>

              <div className="calc-result">
                <div className="calc-result-metric">
                  <strong>{chadsComplete ? `Score: ${chadsScore}` : `${chadsAssessed} of 7 findings assessed`}</strong>
                  <span className="badge">{chadsComplete ? "Factors counted" : "Assessment incomplete"}</span>
                </div>
                <p className="small-text muted">
                  Unassessed findings cannot be counted as absent. Treatment decisions depend on the full clinical picture, bleeding risk, and patient preferences. <a href="https://www.acc.org/latest-in-cardiology/ten-points-to-remember/2023/11/27/19/46/2023-acc-guideline-for-af-gl-af" target="_blank" rel="noopener noreferrer">ACC/AHA guideline summary</a>.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    disabled={!chadsComplete}
                    onClick={() =>
                      insertAndClose(
                          `For educational purposes, explain what a complete CHA2DS2-VASc findings record of ${chadsScore} points represents in atrial fibrillation, its limits, and what a clinician considers when discussing stroke prevention. Do not estimate individual risk or recommend treatment.`
                      )
                    }
                  >
                    Ask MedAssist about this score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={!chadsComplete}
                    onClick={() =>
                        handleCopy(`CHA2DS2-VASc findings record: ${chadsScore} points (all seven inputs assessed; not an individual risk estimate or treatment recommendation)`)
                    }
                  >
                    {copied ? "Copied" : "Copy result"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MAP */}
          {activeTab === "map" && (
            <div id="tabpanel-map" role="tabpanel" aria-labelledby="tab-map" className="calc-pane">
              <p className="small-text muted">
                Mean Arterial Pressure (MAP) represents average arterial pressure throughout one cardiac cycle: (SBP + 2 × DBP) / 3.
              </p>
              <div className="settings-grid">
                <label>
                  Systolic Blood Pressure (mmHg)
                  <input
                    type="number"
                    min="50"
                    max="280"
                    value={mapSbp}
                    onChange={(e) => setMapSbp(e.target.value)}
                  />
                </label>
                <label>
                  Diastolic Blood Pressure (mmHg)
                  <input
                    type="number"
                    min="20"
                    max="180"
                    value={mapDbp}
                    onChange={(e) => setMapDbp(e.target.value)}
                  />
                </label>
              </div>

              {mapVal !== null && (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>MAP: {mapVal} mmHg</strong>
                    <span className="badge">Formula estimate</span>
                  </div>
                  <p className="small-text muted">
                    Pulse pressure: {pulsePressure} mmHg. A calculated MAP alone cannot establish organ perfusion or guide emergency care.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain a calculated MAP of ${mapVal} mmHg from blood pressure ${mapSbp}/${mapDbp} mmHg and why it cannot establish organ perfusion by itself.`
                        )
                      }
                    >
                      Ask MedAssist about this MAP
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() =>
                        handleCopy(`BP: ${mapSbp}/${mapDbp} mmHg | MAP: ${mapVal} mmHg | Pulse Pressure: ${pulsePressure} mmHg`)
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CrCl (Cockcroft-Gault) */}
          {activeTab === "crcl" && (
            <div id="tabpanel-crcl" role="tabpanel" aria-labelledby="tab-crcl" className="calc-pane">
              <p className="small-text muted">
                Cockcroft-Gault estimate: [(140 - age) × weight (kg)] / [72 × serum creatinine (mg/dL)] × (0.85 if female). Weight selection and clinical context affect interpretation.
              </p>
              <div className="settings-grid">
                <label>
                  Biological Sex
                  <select value={crclSex} onChange={(e) => setCrclSex(e.target.value)}>
                    <option value="male">Male (Factor 1.0)</option>
                    <option value="female">Female (Factor 0.85)</option>
                  </select>
                </label>
                <label>
                  Age (years)
                  <input
                    type="number"
                    min="18"
                    max="120"
                    value={crclAge}
                    onChange={(e) => setCrclAge(e.target.value)}
                  />
                </label>
                <label>
                  Actual Weight (kg)
                  <input
                    type="number"
                    step="0.5"
                    min="20"
                    max="350"
                    value={crclWeightKg}
                    onChange={(e) => setCrclWeightKg(e.target.value)}
                  />
                </label>
                <label>
                  Serum Creatinine (mg/dL)
                  <input
                    type="number"
                    step="0.05"
                    min="0.2"
                    max="15.0"
                    value={crclScr}
                    onChange={(e) => setCrclScr(e.target.value)}
                  />
                </label>
              </div>

              {crclVal !== null && (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>CrCl: {crclVal} mL/min</strong>
                    <span className="badge">Formula estimate</span>
                  </div>
                  <p className="small-text muted">
                    This estimate cannot determine a medication dose or diagnose kidney disease. Ask a clinician or pharmacist to interpret it with the full record.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain a Cockcroft-Gault creatinine clearance estimate of ${crclVal} mL/min, its limitations, and why medication decisions require clinician or pharmacist review.`
                        )
                      }
                    >
                      Ask MedAssist about this CrCl
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() =>
                        handleCopy(`CrCl estimate (Cockcroft-Gault): ${crclVal} mL/min (Age: ${crclAge}, Weight: ${crclWeightKg}kg, Scr: ${crclScr}mg/dL; not dosing guidance)`)
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Corrected Calcium */}
          {activeTab === "calcium" && (
            <div id="tabpanel-calcium" role="tabpanel" aria-labelledby="tab-calcium" className="calc-pane">
              <p className="small-text muted">
                Payne equation for hypoalbuminemia: Measured Calcium (mg/dL) + 0.8 × [4.0 - Albumin (g/dL)]. Used when albumin is reduced (&lt; 4.0 g/dL), as ~40% of serum calcium is bound to albumin.
              </p>
              <div className="settings-grid">
                <label>
                  Total Measured Calcium (mg/dL)
                  <input
                    type="number"
                    step="0.1"
                    min="4.0"
                    max="20.0"
                    value={serumCalcium}
                    onChange={(e) => setSerumCalcium(e.target.value)}
                  />
                </label>
                <label>
                  Serum Albumin (g/dL)
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="6.0"
                    value={serumAlbumin}
                    onChange={(e) => setSerumAlbumin(e.target.value)}
                  />
                </label>
              </div>

              {correctedCaVal !== null && (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>{correctedCaVal} mg/dL</strong>
                    <span className="badge">{caClassification}</span>
                  </div>
                  <p className="small-text muted">
                    Formula estimate only. This cannot diagnose hypercalcemia or hypocalcemia. Ionized calcium measurement is the clinical gold standard when calcium binding or acid-base balance is abnormal.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain what a corrected calcium estimate of ${correctedCaVal} mg/dL represents when total calcium is ${serumCalcium} mg/dL and albumin is ${serumAlbumin} g/dL, its formula limitations, and when ionized calcium is ordered.`
                        )
                      }
                    >
                      Ask MedAssist about this calcium
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() =>
                        handleCopy(`Corrected Calcium: ${correctedCaVal} mg/dL (Total Ca: ${serumCalcium} mg/dL, Albumin: ${serumAlbumin} g/dL; Payne formula estimate; not a clinical diagnosis)`)
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: Serum Anion Gap */}
          {activeTab === "aniongap" && (
            <div id="tabpanel-aniongap" role="tabpanel" aria-labelledby="tab-aniongap" className="calc-pane">
              <p className="small-text muted">
                Evaluates unmeasured anions in serum (e.g., ketoacids, lactate, sulfates, phosphates): Sodium (mEq/L) - [Chloride (mEq/L) + Bicarbonate (mEq/L)]. Note: Albumin is the primary unmeasured physiological anion; severe hypoalbuminemia can mask an elevated gap.
              </p>
              <div className="settings-grid">
                <label>
                  Sodium (Na⁺) (mEq/L)
                  <input
                    type="number"
                    step="1"
                    min="100"
                    max="180"
                    value={agSodium}
                    onChange={(e) => setAgSodium(e.target.value)}
                  />
                </label>
                <label>
                  Chloride (Cl⁻) (mEq/L)
                  <input
                    type="number"
                    step="1"
                    min="60"
                    max="140"
                    value={agChloride}
                    onChange={(e) => setAgChloride(e.target.value)}
                  />
                </label>
                <label>
                  Bicarbonate (HCO₃⁻) (mEq/L)
                  <input
                    type="number"
                    step="1"
                    min="5"
                    max="50"
                    value={agBicarbonate}
                    onChange={(e) => setAgBicarbonate(e.target.value)}
                  />
                </label>
              </div>

              {anionGapVal !== null && (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>{anionGapVal} mEq/L</strong>
                    <span className="badge">{anionGapCategory}</span>
                  </div>
                  <p className="small-text muted">
                    Formula estimate only. Reference ranges vary across clinical laboratories and analyzers. A calculated anion gap cannot diagnose metabolic acidosis, ketoacidosis, or toxic ingestion. Arterial blood gas, serum lactate, and comprehensive clinical evaluation are required.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain what a calculated serum anion gap of ${anionGapVal} mEq/L represents when Sodium is ${agSodium} mEq/L, Chloride is ${agChloride} mEq/L, and Bicarbonate is ${agBicarbonate} mEq/L, its formula limitations, and what laboratory tests clinicians evaluate for acid-base disorders.`
                        )
                      }
                    >
                      Ask MedAssist about this anion gap
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() =>
                        handleCopy(`Serum Anion Gap: ${anionGapVal} mEq/L (Na: ${agSodium} mEq/L, Cl: ${agChloride} mEq/L, HCO3: ${agBicarbonate} mEq/L; reference 8-12 mEq/L; educational calculation only; not a diagnosis)`)
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: FeNa */}
          {activeTab === "fena" && (
            <div id="tabpanel-fena" role="tabpanel" aria-labelledby="tab-fena" className="calc-pane">
              <p className="small-text muted">
                Fractional Excretion of Sodium (FeNa): [(Urine Na × Serum Cr) / (Serum Na × Urine Cr)] × 100. Evaluates sodium reabsorption to help differentiate prerenal azotemia from intrinsic acute tubular necrosis in oliguric acute kidney injury.
              </p>
              <div className="settings-grid">
                <label>
                  Serum Sodium (Na⁺) (mEq/L)
                  <input
                    type="number"
                    step="1"
                    min="100"
                    max="180"
                    value={fenaSerumNa}
                    onChange={(e) => setFenaSerumNa(e.target.value)}
                  />
                </label>
                <label>
                  Serum Creatinine (mg/dL)
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    max="20.0"
                    value={fenaSerumCr}
                    onChange={(e) => setFenaSerumCr(e.target.value)}
                  />
                </label>
                <label>
                  Urine Sodium (Na⁺) (mEq/L)
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="250"
                    value={fenaUrineNa}
                    onChange={(e) => setFenaUrineNa(e.target.value)}
                  />
                </label>
                <label>
                  Urine Creatinine (mg/dL)
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="500"
                    value={fenaUrineCr}
                    onChange={(e) => setFenaUrineCr(e.target.value)}
                  />
                </label>
              </div>

              {fenaVal !== null && (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>{fenaVal}%</strong>
                    <span className="badge">{fenaCategory}</span>
                  </div>
                  <p className="small-text muted">
                    Formula estimate only. FeNa can be misleading with diuretics, chronic kidney disease, and some forms of acute kidney injury. No value alone establishes the cause of kidney injury. Ask a clinician to interpret it with the history, examination, and other tests. <a href="https://www.merckmanuals.com/professional/nephrology/approach-to-the-patient-with-renal-issues/evaluation-of-the-patient-with-renal-issues" target="_blank" rel="noopener noreferrer">Read about FeNa limitations</a>.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain the FeNa formula using a ${fenaVal}% example and discuss its limitations with diuretics and kidney disease. Do not diagnose the cause of kidney injury from this value.`
                        )
                      }
                    >
                      Ask MedAssist about this FeNa
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() =>
                        handleCopy(`FeNa estimate: ${fenaVal}% (Serum Na: ${fenaSerumNa} mEq/L, Serum Cr: ${fenaSerumCr} mg/dL, Urine Na: ${fenaUrineNa} mEq/L, Urine Cr: ${fenaUrineCr} mg/dL; educational estimate only; not diagnostic guidance)`)
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: FeUrea */}
          {activeTab === "feurea" && (
            <div id="tabpanel-feurea" role="tabpanel" aria-labelledby="tab-feurea" className="calc-pane">
              <p className="small-text muted">
                Fractional Excretion of Urea (FeUrea): [(Urine Urea × Serum Cr) / (Serum BUN × Urine Cr)] × 100. Evaluates fractional urea clearance, particularly useful when diuretics invalidate FeNa by altering sodium excretion.
              </p>
              <div className="settings-grid">
                <label>
                  Serum BUN (mg/dL)
                  <input
                    type="number"
                    step="1"
                    min="5"
                    max="200"
                    value={feureaBun}
                    onChange={(e) => setFeureaBun(e.target.value)}
                  />
                </label>
                <label>
                  Serum Creatinine (mg/dL)
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    max="20.0"
                    value={feureaScr}
                    onChange={(e) => setFeureaScr(e.target.value)}
                  />
                </label>
                <label>
                  Urine Urea Nitrogen (mg/dL)
                  <input
                    type="number"
                    step="10"
                    min="50"
                    max="3000"
                    value={feureaUrineUrea}
                    onChange={(e) => setFeureaUrineUrea(e.target.value)}
                  />
                </label>
                <label>
                  Urine Creatinine (mg/dL)
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="500"
                    value={feureaUrineCr}
                    onChange={(e) => setFeureaUrineCr(e.target.value)}
                  />
                </label>
              </div>

              {feureaVal !== null && (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>{feureaVal}%</strong>
                    <span className="badge">{feureaCategory}</span>
                  </div>
                  <p className="small-text muted">
                    Formula estimate only. FeUrea can also be misleading; 35%–50% is an indeterminate range in one clinical reference. No value alone diagnoses the cause of kidney injury or guides treatment. Ask a clinician to interpret it with the full clinical picture. <a href="https://www.merckmanuals.com/professional/critical-care-medicine/approach-to-the-critically-ill-patient/oliguria" target="_blank" rel="noopener noreferrer">Read about FeUrea interpretation</a>.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain the FeUrea formula using a ${feureaVal}% example, including the indeterminate range and limitations with diuretics. Do not diagnose the cause of kidney injury from this value.`
                        )
                      }
                    >
                      Ask MedAssist about this FeUrea
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() =>
                        handleCopy(`FeUrea estimate: ${feureaVal}% (Serum BUN: ${feureaBun} mg/dL, Serum Cr: ${feureaScr} mg/dL, Urine Urea: ${feureaUrineUrea} mg/dL, Urine Cr: ${feureaUrineCr} mg/dL; educational estimate only; not diagnostic guidance)`)
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 10: Maintenance Fluids */}
          {activeTab === "fluids" && (
            <div id="tabpanel-fluids" role="tabpanel" aria-labelledby="tab-fluids" className="calc-pane">
              <p className="small-text muted">
                Pediatric teaching example of the Holliday-Segar 4-2-1 rule: 4 mL/kg/hr for the first 10 kg, + 2 mL/kg/hr for kg 11–20, + 1 mL/kg/hr for each kg above 20 kg. It is not an adult fluid prescription.
              </p>
              <div className="settings-grid">
                <label>
                  Example pediatric weight (kg)
                  <input
                    type="number"
                    step="0.5"
                    min="1.0"
                    max="100.0"
                    value={fluidWeightKg}
                    onChange={(e) => setFluidWeightKg(e.target.value)}
                  />
                </label>
              </div>

              {fluidHourlyRate !== null && (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>{fluidHourlyRate} mL/hr</strong>
                    <span className="badge">{fluidDailyVolume.toLocaleString()} mL / 24 hours</span>
                  </div>
                  <p className="small-text muted">
                    Teaching estimate only, not a patient order. Pediatric fluid needs depend on age, illness, losses, kidney and heart function, electrolytes, and monitoring. Do not prescribe or administer IV fluids from this screen. <a href="https://www.merckmanuals.com/professional/pediatrics/dehydration-and-fluid-therapy-in-children/dehydration-in-children" target="_blank" rel="noopener noreferrer">Read the pediatric fluid reference</a>.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain how the pediatric Holliday-Segar 4-2-1 rule works using a ${fluidWeightKg} kg example. Describe why an IV fluid prescription requires a clinician's assessment and monitoring; do not recommend a rate for a real patient.`
                        )
                      }
                    >
                      Ask MedAssist about maintenance fluids
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() =>
                        handleCopy(`Pediatric 4-2-1 teaching example: ${fluidHourlyRate} mL/hr (${fluidDailyVolume} mL/day for an example ${fluidWeightKg} kg weight; not a patient order)`)
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 11: Wells' Criteria for PE */}
          {activeTab === "wells" && (
            <div id="tabpanel-wells" role="tabpanel" aria-labelledby="tab-wells" className="calc-pane">
              <p className="small-text muted">
                Wells&apos; Criteria is a clinician-assessed score used in adult pulmonary embolism (PE) pathways. A low score alone cannot rule out PE. If PE is suspected, seek urgent medical evaluation regardless of this result.
              </p>
              <div className="settings-grid">
                {WELLS_CRITERIA.map(({ id, label, points }) => (
                  <label htmlFor={`wells-${id}-select`} key={id}>
                    {label} (+{points})
                    <select
                      id={`wells-${id}-select`}
                      value={wellsCriteria[id] || "unknown"}
                      onChange={(e) => setWellsCriteria((current) => ({ ...current, [id]: e.target.value }))}
                    >
                      <option value="unknown">Not assessed</option>
                      <option value="absent">Absent</option>
                      <option value="present">Present</option>
                    </select>
                  </label>
                ))}
              </div>

              <div className="calc-result">
                <div className="calc-result-metric">
                  <strong>{wellsComplete ? `${wellsFormatted} points` : `${wellsAssessed} of 7 findings assessed`}</strong>
                  <span className="badge">{wellsComplete ? wellsScoreBand : "Assessment incomplete"}</span>
                </div>
                <p className="small-text">
                  The score band is a reference to the NICE two-level pathway, not a personal risk percentage or a diagnosis.
                </p>
                <p className="small-text muted">
                  Unassessed findings cannot be counted as absent. A clinician must assess the criteria and decide on further testing. Suspected PE is a potential medical emergency. <a href="https://www.nice.org.uk/guidance/ng158/chapter/recommendations" target="_blank" rel="noopener noreferrer">Read the NICE PE pathway</a>.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    disabled={!wellsComplete}
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain the adult Wells' PE score criteria and limitations using an example score of ${wellsFormatted} points. A clinician must assess the criteria and decide on further testing. Do not rule out PE or give a personal probability from this example.`
                      )
                    }
                  >
                    Ask MedAssist about this Wells score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={!wellsComplete}
                    onClick={() =>
                      handleCopy(
                        `Wells' PE findings record: ${wellsFormatted} points (${wellsScoreBand}; all seven findings assessed; not diagnostic guidance)`
                      )
                    }
                  >
                    {copied ? "Copied" : "Copy result"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 12: CURB-65 Pneumonia Severity Score */}
          {activeTab === "curb65" && (
            <div id="tabpanel-curb65" role="tabpanel" aria-labelledby="tab-curb65" className="calc-pane">
              <p className="small-text muted">
                CURB-65 records five findings used by clinicians for adults with diagnosed community-acquired pneumonia. It does not diagnose pneumonia or decide where someone should receive care.
              </p>
              <div className="settings-grid">
                {CURB_CRITERIA.map(({ id, label }) => (
                  <label htmlFor={`curb-${id}-select`} key={id}>
                    {label}
                    <select
                      id={`curb-${id}-select`}
                      value={curbCriteria[id] || "unknown"}
                      onChange={(e) => setCurbCriteria((current) => ({ ...current, [id]: e.target.value }))}
                    >
                      <option value="unknown">Not assessed</option>
                      <option value="absent">Absent</option>
                      <option value="present">Present</option>
                    </select>
                  </label>
                ))}
              </div>

              <div className="calc-result">
                <div className="calc-result-metric">
                  <strong>{curbComplete ? `${curbScore} / 5 points` : `${curbAssessed} of 5 findings assessed`}</strong>
                  <span className="badge">{curbComplete ? curbScoreBand : "Assessment incomplete"}</span>
                </div>
                <p className="small-text">
                  This is an educational count, not an individual mortality prediction. Clinical judgement, oxygen levels, other conditions, and support at home also matter. <a href="https://www.nice.org.uk/guidance/NG250/chapter/recommendations" target="_blank" rel="noopener noreferrer">Read NICE pneumonia guidance</a>.
                </p>
                <p className="small-text muted">
                  Unassessed findings cannot be counted as absent. If someone has severe breathlessness, confusion, or rapid deterioration, seek urgent care regardless of this count.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    disabled={!curbComplete}
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain the CURB-65 findings and limitations using a complete record of ${curbScore}/5 points (${curbScoreBand}). Do not estimate individual mortality or recommend admission, discharge, or treatment from this score.`
                      )
                    }
                  >
                    Ask MedAssist about this CURB-65 score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={!curbComplete}
                    onClick={() =>
                      handleCopy(
                        `CURB-65 findings record: ${curbScore}/5 points (${curbScoreBand}); educational only; not a mortality prediction or care decision`
                      )
                    }
                  >
                    {copied ? "Copied" : "Copy result"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 13: Glasgow Coma Scale (GCS) */}
          {activeTab === "gcs" && (
            <div id="tabpanel-gcs" role="tabpanel" aria-labelledby="tab-gcs" className="calc-pane">
              <p className="small-text muted">
                The Glasgow Coma Scale (GCS) records eye, verbal, and motor responses during a clinical assessment. Select a response only when it has been observed. A component that cannot be tested must not be assigned a numeric score.
              </p>
              <div style={{ marginBottom: "14px" }}>
                <label htmlFor="gcs-eye-select">
                  <strong>Eye Opening Response (E)</strong>:
                  <select
                    id="gcs-eye-select"
                    value={gcsEye}
                    onChange={(e) => setGcsEye(e.target.value)}
                    style={{ width: "100%", marginTop: "6px" }}
                  >
                    <option value="unknown">Not assessed</option>
                    <option value="not_testable">Not testable</option>
                    <option value="4">4 — Spontaneous (open before stimulus)</option>
                    <option value="3">3 — To sound (open after spoken request)</option>
                    <option value="2">2 — To pressure (open after tactile pressure/pain)</option>
                    <option value="1">1 — None (no eye opening at any time)</option>
                  </select>
                </label>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label htmlFor="gcs-verbal-select">
                  <strong>Verbal Response (V)</strong>:
                  <select
                    id="gcs-verbal-select"
                    value={gcsVerbal}
                    onChange={(e) => setGcsVerbal(e.target.value)}
                    style={{ width: "100%", marginTop: "6px" }}
                  >
                    <option value="unknown">Not assessed</option>
                    <option value="not_testable">Not testable</option>
                    <option value="5">5 — Orientated (correctly answers name, place, date)</option>
                    <option value="4">4 — Confused (not orientated but coherent speech)</option>
                    <option value="3">3 — Inappropriate words (random or exclamatory words)</option>
                    <option value="2">2 — Incomprehensible sounds (moaning or groaning only)</option>
                    <option value="1">1 — None (no verbal response)</option>
                  </select>
                </label>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label htmlFor="gcs-motor-select">
                  <strong>Motor Response (M)</strong>:
                  <select
                    id="gcs-motor-select"
                    value={gcsMotor}
                    onChange={(e) => setGcsMotor(e.target.value)}
                    style={{ width: "100%", marginTop: "6px" }}
                  >
                    <option value="unknown">Not assessed</option>
                    <option value="not_testable">Not testable</option>
                    <option value="6">6 — Obeys commands (follows 2-step command)</option>
                    <option value="5">5 — Localising to pain (brings hand above clavicle to stimulus)</option>
                    <option value="4">4 — Normal flexion (rapid withdrawal from painful stimulus)</option>
                    <option value="3">3 — Abnormal flexion / decorticate (slow, patterned adduction/flexion)</option>
                    <option value="2">2 — Extension / decerebrate (straightening of arm, adduction, internal rotation)</option>
                    <option value="1">1 — None (no limb movement to painful stimulus)</option>
                  </select>
                </label>
              </div>

              <div className="calc-result">
                <div className="calc-result-metric">
                  <strong>{gcsComplete ? `${gcsScore} / 15 points (E${gcsEye}V${gcsVerbal}M${gcsMotor})` : gcsNotTestable ? "Total unavailable: component not testable" : `${gcsAssessed} of 3 responses assessed`}</strong>
                  <span className="badge">{gcsComplete ? gcsScoreBand : "Assessment incomplete"}</span>
                </div>
                <p className="small-text">
                  This educational record cannot diagnose the cause or severity of a neurological condition, predict an outcome, or replace a clinical examination.
                </p>
                <p className="small-text muted">
                  Intubation, sedation, paralysis, eye injury, and language barriers can prevent a valid component score. If consciousness changes suddenly or someone is difficult to wake, seek urgent medical care. <a href="https://www.glasgowcomascale.org/faq/" target="_blank" rel="noopener noreferrer">Read GCS assessment guidance</a>.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    disabled={!gcsComplete}
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain the Glasgow Coma Scale components and limitations using a complete record of ${gcsScore}/15 (E${gcsEye}V${gcsVerbal}M${gcsMotor}; ${gcsScoreBand}). Do not diagnose injury severity or recommend individual triage or treatment.`
                      )
                    }
                  >
                    Ask MedAssist about this GCS score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={!gcsComplete}
                    onClick={() =>
                      handleCopy(
                        `GCS responses record: ${gcsScore}/15 (E${gcsEye}V${gcsVerbal}M${gcsMotor}; ${gcsScoreBand}); educational only; not a diagnosis or triage decision`
                      )
                    }
                  >
                    {copied ? "Copied" : "Copy result"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 14: HAS-BLED Bleeding Risk Score */}
          {activeTab === "hasbled" && (
            <div id="tabpanel-hasbled" role="tabpanel" aria-labelledby="tab-hasbled" className="calc-pane">
              <p className="small-text muted">
                HAS-BLED records factors clinicians consider when discussing bleeding risk in atrial fibrillation. Record each finding explicitly; this form cannot predict personal risk or decide whether to use anticoagulation.
              </p>
              <div className="settings-grid">
                {HASBLED_CRITERIA.map(({ id, label }) => (
                  <label htmlFor={`hasbled-${id}-select`} key={id}>
                    {label}
                    <select
                      id={`hasbled-${id}-select`}
                      value={hasbledCriteria[id] || "unknown"}
                      onChange={(e) => setHasbledCriteria((current) => ({ ...current, [id]: e.target.value }))}
                    >
                      <option value="unknown">Not assessed</option>
                      <option value="absent">Absent</option>
                      <option value="present">Present</option>
                      {id === "labileInr" && <option value="not_applicable">Not applicable (no vitamin K antagonist)</option>}
                    </select>
                  </label>
                ))}
              </div>

              <div className="calc-result">
                <div className="calc-result-metric">
                  <strong>{hasbledComplete ? `${hasbledScore} / 9 points` : `${hasbledAssessed} of 9 findings assessed`}</strong>
                  <span className="badge">{hasbledComplete ? hasbledScoreBand : "Assessment incomplete"}</span>
                </div>
                <p className="small-text">
                  An educational count cannot determine personal bleeding risk or whether to start, stop, or withhold anticoagulation. A clinician should assess stroke risk, bleeding factors, and treatment together. <a href="https://www.acc.org/latest-in-cardiology/ten-points-to-remember/2023/11/27/19/46/2023-acc-guideline-for-af-gl-af" target="_blank" rel="noopener noreferrer">Read AF guideline summary</a>.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    disabled={!hasbledComplete}
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain the HAS-BLED factors and limitations using a complete record of ${hasbledScore}/9 points (${hasbledScoreBand}). Explain why bleeding scores should not decide anticoagulation alone. Do not recommend treatment for an individual.`
                      )
                    }
                  >
                    Ask MedAssist about this HAS-BLED score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={!hasbledComplete}
                    onClick={() =>
                      handleCopy(
                        `HAS-BLED findings record: ${hasbledScore}/9 points (${hasbledScoreBand}); educational only; not an individual risk prediction or treatment decision`
                      )
                    }
                  >
                    {copied ? "Copied" : "Copy result"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 15: qSOFA (Quick Sepsis-related Organ Failure Assessment) */}
          {activeTab === "qsofa" && (
            <div id="tabpanel-qsofa" role="tabpanel" aria-labelledby="tab-qsofa" className="calc-pane">
              <p className="small-text muted">
                qSOFA is a bedside score for adults with suspected infection. Record each finding explicitly. It must not be used alone to screen for or exclude sepsis.
              </p>
              <div className="settings-grid">
                {QSOFA_CRITERIA.map(({ id, label }) => (
                  <label htmlFor={`qsofa-${id}-select`} key={id}>
                    {label}
                    <select
                      id={`qsofa-${id}-select`}
                      value={qsofaCriteria[id] || "unknown"}
                      onChange={(e) => setQsofaCriteria((current) => ({ ...current, [id]: e.target.value }))}
                    >
                      <option value="unknown">Not assessed</option>
                      <option value="absent">Absent</option>
                      <option value="present">Present</option>
                    </select>
                  </label>
                ))}
              </div>

              <div className="calc-result">
                <div className="calc-result-metric">
                  <strong>{qsofaComplete ? `${qsofaScore} / 3 points` : `${qsofaAssessed} of 3 findings assessed`}</strong>
                  <span className="badge">{qsofaComplete ? "All findings recorded" : "Assessment incomplete"}</span>
                </div>
                <p className="small-text">
                  A low qSOFA count does not exclude sepsis, and the score is not a diagnosis. If infection is suspected and someone is confused, breathless, faint, or rapidly worsening, seek urgent medical assessment regardless of this count. <a href="https://www.sccm.org/survivingsepsiscampaign/guidelines-and-resources/surviving-sepsis-campaign-adult-guidelines" target="_blank" rel="noopener noreferrer">Read current sepsis guidance</a>.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    disabled={!qsofaComplete}
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain the qSOFA criteria and limitations using a record of ${qsofaScore}/3 points. Explain why a low count cannot exclude sepsis and why qSOFA should not be the sole screening tool. Do not make an individual diagnosis or treatment plan.`
                      )
                    }
                  >
                    Ask MedAssist about this qSOFA score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={!qsofaComplete}
                    onClick={() =>
                      handleCopy(
                        `qSOFA findings record: ${qsofaScore}/3 points; educational only; low count does not exclude sepsis`
                      )
                    }
                  >
                    {copied ? "Copied" : "Copy result"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 16: BSA (Body Surface Area - Mosteller) */}
          {activeTab === "bsa" && (
            <div id="tabpanel-bsa" role="tabpanel" aria-labelledby="tab-bsa" className="calc-pane">
              <p className="small-text muted">
                The Mosteller formula is the widely utilized clinical standard for estimating Body Surface Area (BSA), applied in antineoplastic chemotherapy dosing, cardiac index calculations (L/min/m²), and normalizing glomerular filtration and hemodynamic parameters.
              </p>
              <div className="calc-unit-toggle">
                <button
                  type="button"
                  className={`button small ${bsaUnit === "metric" ? "" : "secondary"}`}
                  onClick={() => setBsaUnit("metric")}
                >
                  Metric (cm / kg)
                </button>
                <button
                  type="button"
                  className={`button small ${bsaUnit === "imperial" ? "" : "secondary"}`}
                  onClick={() => setBsaUnit("imperial")}
                >
                  Imperial (in / lbs)
                </button>
              </div>

              {bsaUnit === "metric" ? (
                <div className="settings-grid">
                  <label>
                    Height (cm)
                    <input
                      type="number"
                      step="1"
                      min="30"
                      max="250"
                      value={bsaHeightCm}
                      onChange={(e) => setBsaHeightCm(e.target.value)}
                    />
                  </label>
                  <label>
                    Weight (kg)
                    <input
                      type="number"
                      step="0.5"
                      min="2"
                      max="350"
                      value={bsaWeightKg}
                      onChange={(e) => setBsaWeightKg(e.target.value)}
                    />
                  </label>
                </div>
              ) : (
                <div className="settings-grid">
                  <label>
                    Height (inches)
                    <input
                      type="number"
                      step="0.5"
                      min="12"
                      max="100"
                      value={bsaHeightIn}
                      onChange={(e) => setBsaHeightIn(e.target.value)}
                    />
                  </label>
                  <label>
                    Weight (lbs)
                    <input
                      type="number"
                      step="1"
                      min="5"
                      max="800"
                      value={bsaWeightLbs}
                      onChange={(e) => setBsaWeightLbs(e.target.value)}
                    />
                  </label>
                </div>
              )}

              {bsaVal !== null ? (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>{bsaVal} m²</strong>
                    <span className="badge">Mosteller BSA</span>
                  </div>
                  <p className="small-text">
                    Average adult reference BSA is ~1.73 m² (adult males ~1.9 m², adult females ~1.6 m²).
                  </p>
                  <p className="small-text muted">
                    Educational reference only. In oncology chemotherapy and critical care, institutional protocols often cap BSA (e.g. at 2.0 m²) or utilize ideal/adjusted body weight dosing in severe obesity to prevent drug toxicity.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain how a Mosteller Body Surface Area (BSA) of ${bsaVal} m² is utilized in oncology chemotherapy dosing, cardiac index calculations (L/min/m²), and physiological normalization, and why clinical protocols sometimes cap BSA in obesity.`
                        )
                      }
                    >
                      Ask MedAssist about this BSA
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() =>
                        handleCopy(
                          `Estimated Body Surface Area (Mosteller): ${bsaVal} m² (reference adult norm ~1.73 m²; educational estimate only; not a chemotherapy or medication order)`
                        )
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="muted small-text" style={{ marginTop: "12px" }}>
                  Please enter a valid height ({bsaUnit === "metric" ? "30–250 cm" : "12–100 in"}) and weight ({bsaUnit === "metric" ? "2–350 kg" : "5–800 lbs"}).
                </p>
              )}
            </div>
          )}

          {/* TAB 17: APRI (AST to Platelet Ratio Index) */}
          {activeTab === "apri" && (
            <div id="tabpanel-apri" role="tabpanel" aria-labelledby="tab-apri" className="calc-pane">
              <p className="small-text muted">
                APRI is a laboratory index used in some liver-disease evaluations: [(AST / AST ULN) / Platelet Count (10⁹/L)] × 100. Enter measured values and your laboratory’s AST upper limit. Its interpretation varies by condition and setting; the index alone cannot diagnose or exclude fibrosis or cirrhosis.
              </p>
              <div className="settings-grid">
                <label>
                  AST (Aspartate Aminotransferase) (U/L)
                  <input
                    type="number"
                    step="1"
                    min="5"
                    max="2000"
                    value={apriAst}
                    onChange={(e) => setApriAst(e.target.value)}
                  />
                </label>
                <label>
                  AST Upper Limit of Normal (ULN) (U/L)
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="100"
                    value={apriAstUln}
                    onChange={(e) => setApriAstUln(e.target.value)}
                  />
                </label>
                <label>
                  Platelet Count (10⁹/L or ×10³/µL)
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="1000"
                    value={apriPlatelets}
                    onChange={(e) => setApriPlatelets(e.target.value)}
                  />
                </label>
              </div>

              {apriVal !== null ? (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>Score: {apriVal}</strong>
                    <span className="badge">Laboratory index</span>
                  </div>
                  <p className="small-text">
                    The displayed number is the calculated index, not a fibrosis stage or a diagnosis. Published decision thresholds differ across liver conditions and care settings.
                  </p>
                  <p className="small-text muted">
                    Discuss interpretation and any further testing with a clinician. <a href="https://www.aasld.org/liver-fellow-network/core-series/why-series/why-are-non-invasive-risk-scores-such-fib-4-used" target="_blank" rel="noopener noreferrer">Read the AASLD overview of non-invasive fibrosis scores</a>.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain how an AST to Platelet Ratio Index (APRI) value of ${apriVal} is calculated and why interpretation depends on the liver condition and clinical setting. Compare its limitations with FIB-4 and transient elastography without diagnosing an individual or recommending a personal follow-up plan.`
                        )
                      }
                    >
                      Ask MedAssist about this APRI score
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() =>
                        handleCopy(
                          `AST to Platelet Ratio Index (APRI): ${apriVal}; calculated laboratory index only, not a fibrosis diagnosis or individual risk prediction`
                        )
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="muted small-text" style={{ marginTop: "12px" }}>
                  Please enter valid AST (5–2000 U/L), AST ULN (10–100 U/L), and Platelet count (10–1000 ×10⁹/L).
                </p>
              )}
            </div>
          )}

          {/* TAB 18: Child-Pugh cirrhosis classification */}
          {activeTab === "childpugh" && (
            <div id="tabpanel-childpugh" role="tabpanel" aria-labelledby="tab-childpugh" className="calc-pane">
              <p className="small-text muted">
                Child-Pugh (Child-Turcotte-Pugh / CTP) classifies cirrhosis using three laboratory results and two clinical assessments. Enter current findings for all five components. A class alone cannot predict an individual’s survival or surgical risk.
              </p>
              <div className="settings-grid">
                <label htmlFor="cp-bilirubin">
                  Total Bilirubin (mg/dL)
                  <input
                    id="cp-bilirubin"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    value={cpBilirubin}
                    onChange={(e) => setCpBilirubin(e.target.value)}
                  />
                </label>
                <label htmlFor="cp-albumin">
                  Serum Albumin (g/dL)
                  <input
                    id="cp-albumin"
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="6.0"
                    value={cpAlbumin}
                    onChange={(e) => setCpAlbumin(e.target.value)}
                  />
                </label>
                <label htmlFor="cp-inr">
                  INR (Prothrombin Time / INR)
                  <input
                    id="cp-inr"
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10.0"
                    value={cpInr}
                    onChange={(e) => setCpInr(e.target.value)}
                  />
                </label>
                <label htmlFor="cp-ascites">
                  Ascites
                  <select
                    id="cp-ascites"
                    aria-label="Ascites"
                    value={cpAscites}
                    onChange={(e) => setCpAscites(e.target.value)}
                  >
                    <option value="unknown">Not assessed</option>
                    <option value="none">None (+1)</option>
                    <option value="mild">Slight / Controlled by diuretics (+2)</option>
                    <option value="moderate">Moderate to severe / Refractory (+3)</option>
                  </select>
                </label>
                <label htmlFor="cp-encephalopathy">
                  Hepatic Encephalopathy
                  <select
                    id="cp-encephalopathy"
                    aria-label="Hepatic Encephalopathy"
                    value={cpEncephalopathy}
                    onChange={(e) => setCpEncephalopathy(e.target.value)}
                  >
                    <option value="unknown">Not assessed</option>
                    <option value="none">None (+1)</option>
                    <option value="grade1_2">Grade 1–2 (Mild confusion, sleep inversion, asterixis) (+2)</option>
                    <option value="grade3_4">Grade 3–4 (Severe confusion, somnolence, coma) (+3)</option>
                  </select>
                </label>
              </div>

              {cpScore !== null ? (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>Score: {cpScore} points</strong>
                    <span className="badge">{cpClass}</span>
                  </div>
                  <p className="small-text muted">
                    Educational classification only. Ascites and encephalopathy assessments require clinical judgment. Do not use this class alone for prognosis, surgery, or transplant decisions. US liver allocation uses an updated MELD formula.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain the five components of a Child-Pugh score of ${cpScore} points (${cpClass}), its limitations for an individual patient, and how clinicians assess cirrhosis alongside current transplant-allocation criteria. Do not infer personal survival or surgical mortality from this class.`
                        )
                      }
                    >
                      Ask MedAssist about this Child-Pugh score
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() =>
                        handleCopy(
                          `Child-Pugh classification: ${cpScore} points (${cpClass}; educational only; not an individual prognosis or surgical decision)`
                        )
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="muted small-text" style={{ marginTop: "12px" }}>
                  Enter valid Bilirubin (0.1–50 mg/dL), Albumin (0.5–6.0 g/dL), INR (0.5–10.0), and assess ascites and encephalopathy to calculate a class.
                </p>
              )}
            </div>
          )}

          {/* TAB 19: MELD-Na (Model for End-Stage Liver Disease) */}
          {activeTab === "meld" && (
            <div id="tabpanel-meld" role="tabpanel" aria-labelledby="tab-meld" className="calc-pane">
              <p className="small-text muted">
                This tool reproduces the historical 2016 MELD-Na equation for education. OPTN adopted MELD 3.0 for allocation in 2023. This result is not a current allocation score or a personal mortality prediction. <a href="https://optn.transplant.hrsa.gov/data/allocation-calculators/meld-calculator/" target="_blank" rel="noopener noreferrer">View the current OPTN calculator</a>.
              </p>
              <div className="settings-grid">
                <label htmlFor="meld-bilirubin">
                  Total Bilirubin (mg/dL)
                  <input
                    id="meld-bilirubin"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    value={meldBilirubin}
                    onChange={(e) => setMeldBilirubin(e.target.value)}
                  />
                </label>
                <label htmlFor="meld-creatinine">
                  Serum Creatinine (mg/dL)
                  <input
                    id="meld-creatinine"
                    aria-label="Serum Creatinine (mg/dL)"
                    aria-describedby={meldDialysis === "yes" ? "meld-creatinine-note" : undefined}
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="15.0"
                    value={meldCreatinine}
                    disabled={meldDialysis === "yes"}
                    onChange={(e) => setMeldCreatinine(e.target.value)}
                  />
                  {meldDialysis === "yes" && <span id="meld-creatinine-note" className="small-text muted">The historical equation uses 4.0 mg/dL here; the entered laboratory value is not used.</span>}
                </label>
                <label htmlFor="meld-inr">
                  INR (Prothrombin Time / INR)
                  <input
                    id="meld-inr"
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10.0"
                    value={meldInr}
                    onChange={(e) => setMeldInr(e.target.value)}
                  />
                </label>
                <label htmlFor="meld-sodium">
                  Serum Sodium (mEq/L)
                  <input
                    id="meld-sodium"
                    type="number"
                    step="1"
                    min="100"
                    max="160"
                    value={meldSodium}
                    onChange={(e) => setMeldSodium(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ marginTop: "12px", marginBottom: "8px" }}>
                <label htmlFor="meld-dialysis-select">
                  Two or more dialysis treatments in the prior 7 days (historical equation)
                  <select id="meld-dialysis-select" value={meldDialysis} onChange={(e) => setMeldDialysis(e.target.value)}>
                    <option value="unknown">Not assessed</option>
                    <option value="no">No</option>
                    <option value="yes">Yes (2016 equation uses creatinine 4.0 mg/dL)</option>
                  </select>
                </label>
              </div>

              {meldScore !== null ? (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>Score: {meldScore} points</strong>
                    <span className="badge">{meldBand}</span>
                  </div>
                  <p className="small-text">
                    Historical 2016 equation, with a 6–40 point output. The sodium term applies when the initial MELD result exceeds 11. This point count cannot determine current transplant priority.
                  </p>
                  <p className="small-text muted">
                    Current OPTN MELD 3.0 uses additional inputs and different coefficients. Do not compare this historical value with a current listing score or use it for a care decision.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain the historical 2016 MELD-Na equation using a complete input record that produces ${meldScore} points (${meldBand}). Explain how it differs from the current OPTN MELD 3.0 allocation formula. Do not predict individual mortality or transplant priority.`
                        )
                      }
                    >
                      Ask MedAssist about this MELD-Na score
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() =>
                        handleCopy(
                          `Historical 2016 MELD-Na teaching equation: ${meldScore} points (${meldBand}); not a current OPTN allocation score or personal mortality prediction`
                        )
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="muted small-text" style={{ marginTop: "12px" }}>
                  Enter bilirubin (0.1–50 mg/dL), {meldDialysis === "yes" ? "dialysis status" : "creatinine (0.1–15 mg/dL)"}, INR (0.5–10.0), sodium (100–160 mEq/L), and an explicit dialysis answer to view the historical point count.
                </p>
              )}
            </div>
          )}

          {/* TAB 20: Modified Centor (McIsaac) Score */}
          {activeTab === "centor" && (
            <div id="tabpanel-centor" role="tabpanel" aria-labelledby="tab-centor" className="calc-pane">
              <p className="small-text muted">
                The Modified Centor (McIsaac) criteria describe findings used by clinicians when evaluating a sore throat in people aged 3 and older. Record each finding explicitly. The score cannot diagnose strep throat or decide whether an individual needs testing or antibiotics.
              </p>
              <div className="settings-grid">
                {CENTOR_CRITERIA.map(({ id, label }) => (
                  <label htmlFor={`centor-${id}-select`} key={id}>
                    {label}
                    <select
                      id={`centor-${id}-select`}
                      value={centorCriteria[id] || "unknown"}
                      onChange={(e) => setCentorCriteria((current) => ({ ...current, [id]: e.target.value }))}
                    >
                      <option value="unknown">Not assessed</option>
                      <option value="absent">Absent</option>
                      <option value="present">Present (+1 point)</option>
                    </select>
                  </label>
                ))}
                <label htmlFor="centor-age-select">
                  Age group (McIsaac criteria)
                  <select
                    id="centor-age-select"
                    aria-label="Age group (McIsaac criteria)"
                    value={centorAgeGroup}
                    onChange={(e) => setCentorAgeGroup(e.target.value)}
                  >
                    <option value="unknown">Not assessed</option>
                    <option value="3to14">3 to 14 years old (+1)</option>
                    <option value="15to44">15 to 44 years old (0)</option>
                    <option value="45plus">45 years and older (-1)</option>
                  </select>
                </label>
              </div>

              <div className="calc-result">
                <div className="calc-result-metric">
                  <strong>{centorComplete ? `Score: ${centorScore} ${centorScore === 1 ? "point" : "points"}` : `${centorAssessed} of 5 inputs assessed`}</strong>
                  <span className="badge">{centorComplete ? centorStratification : "Assessment incomplete"}</span>
                </div>
                <p className="small-text">
                  A clinician considers symptoms, examination, age, and local guidance before deciding on a throat test or treatment. Clinical findings alone cannot distinguish strep from viral sore throat when clear viral symptoms are absent. <a href="https://www.cdc.gov/group-a-strep/hcp/clinical-guidance/strep-throat.html" target="_blank" rel="noopener noreferrer">Read CDC guidance</a>.
                </p>
                <p className="small-text muted">
                  Educational record only. Do not use this score alone to start, avoid, or stop antibiotics. It does not replace examination or a test result.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    disabled={!centorComplete}
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain the components and limitations of a Modified Centor / McIsaac score of ${centorScore} points (${centorStratification}). Explain why clinical examination alone cannot diagnose group A strep, without recommending testing or antibiotics for an individual.`
                      )
                    }
                  >
                    Ask MedAssist about this Centor score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={!centorComplete}
                    onClick={() =>
                      handleCopy(
                        `Modified Centor (McIsaac) criteria record: ${centorScore} points (${centorStratification}; educational only; not a diagnosis or treatment decision)`
                      )
                    }
                  >
                    {copied ? "Copied" : "Copy result"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 21: HEART Score for Major Adverse Cardiac Events */}
          {activeTab === "heart" && (
            <div id="tabpanel-heart" role="tabpanel" aria-labelledby="tab-heart" className="calc-pane">
              <p className="small-text muted">
                The HEART Score is an evidence-based clinical decision rule designed for emergency department and acute care settings to stratify 6-week risk of Major Adverse Cardiac Events (MACE: myocardial infarction, PCI, CABG, death) in adult patients presenting with acute chest pain suspicious for acute coronary syndrome.
              </p>
              <div className="settings-grid">
                <label htmlFor="heart-history-select">
                  History (anamnesis suspicion)
                  <select
                    id="heart-history-select"
                    aria-label="History (anamnesis suspicion)"
                    value={heartHistory}
                    onChange={(e) => setHeartHistory(e.target.value)}
                  >
                    <option value="unknown">Not assessed</option>
                    <option value="slightly">Slightly suspicious (0 points)</option>
                    <option value="moderate">Moderately suspicious (+1 point)</option>
                    <option value="highly">Highly suspicious (+2 points)</option>
                  </select>
                </label>
                <label htmlFor="heart-ecg-select">
                  ECG (electrocardiogram)
                  <select
                    id="heart-ecg-select"
                    aria-label="ECG (electrocardiogram)"
                    value={heartEcg}
                    onChange={(e) => setHeartEcg(e.target.value)}
                  >
                    <option value="unknown">Not assessed</option>
                    <option value="normal">Normal (0 points)</option>
                    <option value="nonspecific">Non-specific repolarization / LBBB / PM (+1 point)</option>
                    <option value="st_deviation">Significant ST depression or elevation (+2 points)</option>
                  </select>
                </label>
                <label htmlFor="heart-age-select">
                  Age
                  <select
                    id="heart-age-select"
                    aria-label="Age"
                    value={heartAge}
                    onChange={(e) => setHeartAge(e.target.value)}
                  >
                    <option value="unknown">Not assessed</option>
                    <option value="under45">&lt; 45 years old (0 points)</option>
                    <option value="45to64">45 to 64 years old (+1 point)</option>
                    <option value="65plus">&ge; 65 years old (+2 points)</option>
                  </select>
                </label>
                <label htmlFor="heart-risk-select">
                  Risk factors (HTN, hyperlipidemia, DM, smoking, family history, obesity)
                  <select
                    id="heart-risk-select"
                    aria-label="Risk factors (HTN, hyperlipidemia, DM, smoking, family history, obesity)"
                    value={heartRisk}
                    onChange={(e) => setHeartRisk(e.target.value)}
                  >
                    <option value="unknown">Not assessed</option>
                    <option value="none">No known risk factors (0 points)</option>
                    <option value="one_two">1 or 2 risk factors (+1 point)</option>
                    <option value="three_plus">&ge; 3 risk factors or atherosclerotic disease (+2 points)</option>
                  </select>
                </label>
                <label htmlFor="heart-troponin-select">
                  Initial Troponin
                  <select
                    id="heart-troponin-select"
                    aria-label="Initial Troponin"
                    value={heartTroponin}
                    onChange={(e) => setHeartTroponin(e.target.value)}
                  >
                    <option value="unknown">Not assessed</option>
                    <option value="normal">&le; Normal reference limit (0 points)</option>
                    <option value="one_to_three">1 to 3&times; normal limit (+1 point)</option>
                    <option value="greater_three">&gt; 3&times; normal limit (+2 points)</option>
                  </select>
                </label>
              </div>

              <div className="calc-result" style={{ marginTop: "16px" }}>
                <div className="calc-result-metric">
                  <strong>{heartComplete ? `Score: ${heartScore} ${heartScore === 1 ? "point" : "points"}` : `${heartAssessed} of 5 inputs assessed`}</strong>
                  <span className="badge">{heartComplete ? heartStratification : "Assessment incomplete"}</span>
                </div>
                <p className="small-text">
                  Scores range from 0 to 10 points. The point band is educational and cannot determine whether discharge, further testing, or treatment is safe. A clinician must assess the symptoms, ECG, troponin assay, and local pathway together.
                </p>
                <p className="small-text muted">
                  If chest pain is new, severe, or accompanied by breathlessness, fainting, or sweating, seek urgent care through local emergency services. Do not use this calculator to delay care.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    disabled={!heartComplete}
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain the components and limitations of a HEART Score of ${heartScore} points (${heartStratification}). Do not recommend discharge, testing, or treatment for an individual from this score.`
                      )
                    }
                  >
                    Ask MedAssist about this HEART score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={!heartComplete}
                    onClick={() =>
                      handleCopy(
                        `HEART Score: ${heartScore} points (${heartStratification}; educational estimate only; cannot determine safe discharge, testing, or treatment)`
                      )
                    }
                  >
                    {copied ? "Copied" : "Copy result"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 22: PERC Rule for Pulmonary Embolism Rule-out */}
          {activeTab === "perc" && (
            <div id="tabpanel-perc" role="tabpanel" aria-labelledby="tab-perc" className="calc-pane">
              <p className="small-text muted">
                PERC is a clinical decision rule for emergency clinicians who have independently judged a patient to have low probability of pulmonary embolism. Record each criterion explicitly. This form cannot establish low pretest probability, rule out a clot, or decide whether testing is needed.
              </p>
              <div className="settings-grid">
                {PERC_CRITERIA.map(({ id, label }) => (
                  <label htmlFor={`perc-${id}-select`} key={id}>
                    {label}
                    <select
                      id={`perc-${id}-select`}
                      value={percCriteria[id] || "unknown"}
                      onChange={(e) => setPercCriteria((current) => ({ ...current, [id]: e.target.value }))}
                    >
                      <option value="unknown">Not assessed</option>
                      <option value="absent">Absent</option>
                      <option value="present">Present</option>
                    </select>
                  </label>
                ))}
              </div>

              <div className="calc-result" style={{ marginTop: "16px" }}>
                <div className="calc-result-metric">
                  <strong>{percComplete ? `${percScore} of 8 criteria present` : `${percAssessed} of 8 criteria assessed`}</strong>
                  <span className="badge">{percComplete ? "All criteria recorded" : "Assessment incomplete"}</span>
                </div>
                <p className="small-text">
                  {percComplete
                    ? "These recorded criteria are not a diagnosis or a rule-out decision. A clinician must establish pretest probability and interpret the findings in context."
                    : "Select Present or Absent for every criterion before viewing a count. Unassessed criteria cannot be treated as absent."}
                </p>
                <p className="small-text muted">
                  If you have sudden breathlessness, chest pain, fainting, or cough up blood, seek urgent care through local emergency services. Do not use this tool to delay evaluation.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    disabled={!percComplete}
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain the eight PERC criteria and the limitations of a record with ${percScore} of 8 criteria present. Explain why a clinician must establish low pretest probability first. Do not give an individual rule-out, testing, or treatment recommendation.`
                      )
                    }
                  >
                    Ask MedAssist about this PERC rule
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={!percComplete}
                    onClick={() =>
                      handleCopy(
                        `PERC criteria record: ${percScore} of 8 present; educational only; not a diagnosis or rule-out decision`
                      )
                    }
                  >
                    {copied ? "Copied" : "Copy result"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
