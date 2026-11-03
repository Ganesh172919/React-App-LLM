import { useState, useEffect, useId, useRef } from "react";

export default function ClinicalCalculatorsModal({ isOpen, onClose, onInsertPrompt }) {
  const [activeTab, setActiveTab] = useState("bmi");
  const [copied, setCopied] = useState(false);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onCloseRef.current(); return; }
      const tabList = ["bmi", "egfr", "chads", "map", "crcl", "calcium", "aniongap", "fena", "feurea", "fluids", "wells", "curb65", "gcs", "hasbled", "qsofa", "bsa", "apri", "childpugh", "meld", "centor", "heart"];
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
  const [chadsChf, setChadsChf] = useState(false);
  const [chadsHtn, setChadsHtn] = useState(false);
  const [chadsAgeGroup, setChadsAgeGroup] = useState("under65"); // under65 | 65to74 | 75plus
  const [chadsDm, setChadsDm] = useState(false);
  const [chadsStroke, setChadsStroke] = useState(false);
  const [chadsVascular, setChadsVascular] = useState(false);
  const [chadsSex, setChadsSex] = useState("female"); // female | male

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
  const [wellsDvtSymptoms, setWellsDvtSymptoms] = useState(false);
  const [wellsPeLikely, setWellsPeLikely] = useState(false);
  const [wellsTachycardia, setWellsTachycardia] = useState(false);
  const [wellsImmobilization, setWellsImmobilization] = useState(false);
  const [wellsPriorDvtPe, setWellsPriorDvtPe] = useState(false);
  const [wellsHemoptysis, setWellsHemoptysis] = useState(false);
  const [wellsMalignancy, setWellsMalignancy] = useState(false);

  // CURB-65 State
  const [curbConfusion, setCurbConfusion] = useState(false);
  const [curbUrea, setCurbUrea] = useState(false);
  const [curbRespiratory, setCurbRespiratory] = useState(false);
  const [curbBp, setCurbBp] = useState(false);
  const [curbAge65, setCurbAge65] = useState(false);

  // GCS (Glasgow Coma Scale) State
  const [gcsEye, setGcsEye] = useState("4");
  const [gcsVerbal, setGcsVerbal] = useState("5");
  const [gcsMotor, setGcsMotor] = useState("6");

  // HAS-BLED State
  const [hasbledHtn, setHasbledHtn] = useState(false);
  const [hasbledRenal, setHasbledRenal] = useState(false);
  const [hasbledLiver, setHasbledLiver] = useState(false);
  const [hasbledStroke, setHasbledStroke] = useState(false);
  const [hasbledBleeding, setHasbledBleeding] = useState(false);
  const [hasbledLabileInr, setHasbledLabileInr] = useState(false);
  const [hasbledElderly, setHasbledElderly] = useState(false);
  const [hasbledDrugs, setHasbledDrugs] = useState(false);
  const [hasbledAlcohol, setHasbledAlcohol] = useState(false);

  // qSOFA State
  const [qsofaMental, setQsofaMental] = useState(false);
  const [qsofaResp, setQsofaResp] = useState(false);
  const [qsofaBp, setQsofaBp] = useState(false);

  // BSA (Body Surface Area - Mosteller) State
  const [bsaUnit, setBsaUnit] = useState("metric"); // metric | imperial
  const [bsaHeightCm, setBsaHeightCm] = useState("175");
  const [bsaWeightKg, setBsaWeightKg] = useState("70");
  const [bsaHeightIn, setBsaHeightIn] = useState("69");
  const [bsaWeightLbs, setBsaWeightLbs] = useState("154");

  // APRI (AST to Platelet Ratio Index) State
  const [apriAst, setApriAst] = useState("45"); // U/L
  const [apriAstUln, setApriAstUln] = useState("40"); // U/L
  const [apriPlatelets, setApriPlatelets] = useState("150"); // 10^9/L or x10^3/uL

  // Child-Pugh Score State
  const [cpBilirubin, setCpBilirubin] = useState("1.5"); // mg/dL
  const [cpAlbumin, setCpAlbumin] = useState("3.8"); // g/dL
  const [cpInr, setCpInr] = useState("1.1");
  const [cpAscites, setCpAscites] = useState("none"); // none | mild | moderate
  const [cpEncephalopathy, setCpEncephalopathy] = useState("none"); // none | grade1_2 | grade3_4

  // MELD-Na Score State
  const [meldBilirubin, setMeldBilirubin] = useState("1.5"); // mg/dL
  const [meldCreatinine, setMeldCreatinine] = useState("1.2"); // mg/dL
  const [meldInr, setMeldInr] = useState("1.3");
  const [meldSodium, setMeldSodium] = useState("135"); // mEq/L
  const [meldDialysis, setMeldDialysis] = useState(false); // Dialysis >= 2 times in prior 7 days

  // Modified Centor / McIsaac Score State
  const [centorTonsils, setCentorTonsils] = useState(false);
  const [centorNodes, setCentorNodes] = useState(false);
  const [centorFever, setCentorFever] = useState(false);
  const [centorNoCough, setCentorNoCough] = useState(false);
  const [centorAgeGroup, setCentorAgeGroup] = useState("15to44"); // 3to14 | 15to44 | 45plus

  // HEART Score State
  const [heartHistory, setHeartHistory] = useState("moderate"); // slightly (0) | moderate (1) | highly (2)
  const [heartEcg, setHeartEcg] = useState("normal"); // normal (0) | nonspecific (1) | st_deviation (2)
  const [heartAge, setHeartAge] = useState("45to64"); // under45 (0) | 45to64 (1) | 65plus (2)
  const [heartRisk, setHeartRisk] = useState("one_two"); // none (0) | one_two (1) | three_plus (2)
  const [heartTroponin, setHeartTroponin] = useState("normal"); // normal (0) | one_to_three (1) | greater_three (2)

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
  let chadsScore = 0;
  if (chadsChf) chadsScore += 1;
  if (chadsHtn) chadsScore += 1;
  if (chadsAgeGroup === "75plus") chadsScore += 2;
  else if (chadsAgeGroup === "65to74") chadsScore += 1;
  if (chadsDm) chadsScore += 1;
  if (chadsStroke) chadsScore += 2;
  if (chadsVascular) chadsScore += 1;
  if (chadsSex === "female") chadsScore += 1;

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
  let wellsScore = 0;
  if (wellsDvtSymptoms) wellsScore += 3.0;
  if (wellsPeLikely) wellsScore += 3.0;
  if (wellsTachycardia) wellsScore += 1.5;
  if (wellsImmobilization) wellsScore += 1.5;
  if (wellsPriorDvtPe) wellsScore += 1.5;
  if (wellsHemoptysis) wellsScore += 1.0;
  if (wellsMalignancy) wellsScore += 1.0;

  const wellsFormatted = Number.isInteger(wellsScore) ? String(wellsScore) : wellsScore.toFixed(1);
  const wellsScoreBand = wellsScore <= 4.0 ? "NICE score band: 4 or less" : "NICE score band: above 4";

  // 12. CURB-65 Pneumonia Severity Score
  let curbScore = 0;
  if (curbConfusion) curbScore += 1;
  if (curbUrea) curbScore += 1;
  if (curbRespiratory) curbScore += 1;
  if (curbBp) curbScore += 1;
  if (curbAge65) curbScore += 1;

  let curbStratification = "";
  if (curbScore <= 1) {
    curbStratification = "Low risk (30-day mortality < 3%)";
  } else if (curbScore === 2) {
    curbStratification = "Moderate risk (30-day mortality ~9%)";
  } else {
    curbStratification = `High / severe risk (30-day mortality ${curbScore === 3 ? "15–20%" : "30–40%"})`;
  }

  // 13. Glasgow Coma Scale (GCS)
  const eyeNum = parseInt(gcsEye, 10) || 4;
  const verbalNum = parseInt(gcsVerbal, 10) || 5;
  const motorNum = parseInt(gcsMotor, 10) || 6;
  const gcsScore = eyeNum + verbalNum + motorNum;

  let gcsStratification = "";
  if (gcsScore <= 8) {
    gcsStratification = "Severe brain injury / Coma (3–8)";
  } else if (gcsScore <= 12) {
    gcsStratification = "Moderate brain injury (9–12)";
  } else {
    gcsStratification = "Mild brain injury / Alert (13–15)";
  }

  // 14. HAS-BLED Bleeding Risk Score
  let hasbledScore = 0;
  if (hasbledHtn) hasbledScore += 1;
  if (hasbledRenal) hasbledScore += 1;
  if (hasbledLiver) hasbledScore += 1;
  if (hasbledStroke) hasbledScore += 1;
  if (hasbledBleeding) hasbledScore += 1;
  if (hasbledLabileInr) hasbledScore += 1;
  if (hasbledElderly) hasbledScore += 1;
  if (hasbledDrugs) hasbledScore += 1;
  if (hasbledAlcohol) hasbledScore += 1;

  let hasbledStratification = "";
  if (hasbledScore <= 1) {
    hasbledStratification = "Low bleeding risk (~1.0–1.5% annual risk)";
  } else if (hasbledScore === 2) {
    hasbledStratification = "Moderate bleeding risk (~1.9% annual risk)";
  } else {
    hasbledStratification = "High bleeding risk (≥ 3.7% annual risk; close clinical monitoring & addressing reversible risk factors recommended)";
  }

  // 15. qSOFA (Quick Sepsis-related Organ Failure Assessment)
  let qsofaScore = 0;
  if (qsofaMental) qsofaScore += 1;
  if (qsofaResp) qsofaScore += 1;
  if (qsofaBp) qsofaScore += 1;

  let qsofaStratification = "";
  if (qsofaScore <= 1) {
    qsofaStratification = "Not high risk for in-hospital sepsis mortality (continue clinical monitoring)";
  } else {
    qsofaStratification = "High risk for in-hospital sepsis mortality (prompt evaluation for acute organ dysfunction, blood cultures, lactate, and sepsis protocols recommended)";
  }

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
  let apriStratification = "";
  const ast = parseFloat(apriAst);
  const astUln = parseFloat(apriAstUln);
  const platelets = parseFloat(apriPlatelets);
  if (ast >= 5 && ast <= 2000 && astUln >= 10 && astUln <= 100 && platelets >= 10 && platelets <= 1000) {
    const calc = ((ast / astUln) / platelets) * 100;
    apriVal = calc.toFixed(2);
    const valNum = parseFloat(apriVal);
    if (valNum <= 0.50) {
      apriStratification = "Low probability of significant fibrosis (APRI ≤ 0.50; high negative predictive value)";
    } else if (valNum <= 1.00) {
      apriStratification = "Indeterminate / intermediate fibrosis probability (0.50 < APRI ≤ 1.00)";
    } else if (valNum <= 1.50) {
      apriStratification = "High probability of significant fibrosis (APRI > 1.00; METAVIR F2–F4)";
    } else {
      apriStratification = "High probability of cirrhosis (APRI > 1.50; METAVIR F4)";
    }
  }

  // 18. Child-Pugh Score for Cirrhosis Mortality
  let cpScore = null;
  let cpClass = "";
  let cpInterpretation = "";
  const cpBiliNum = parseFloat(cpBilirubin);
  const cpAlbNum = parseFloat(cpAlbumin);
  const cpInrNum = parseFloat(cpInr);

  if (
    !isNaN(cpBiliNum) && cpBiliNum >= 0.1 && cpBiliNum <= 50 &&
    !isNaN(cpAlbNum) && cpAlbNum >= 0.5 && cpAlbNum <= 6.0 &&
    !isNaN(cpInrNum) && cpInrNum >= 0.5 && cpInrNum <= 10.0
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
      cpInterpretation = "Well-compensated cirrhosis (1-year survival ~100%, 2-year survival ~85%, perioperative abdominal mortality ~10%)";
    } else if (cpScore <= 9) {
      cpClass = "Class B (7–9 points)";
      cpInterpretation = "Significant functional compromise (1-year survival ~80%, 2-year survival ~60%, perioperative abdominal mortality ~30%)";
    } else {
      cpClass = "Class C (10–15 points)";
      cpInterpretation = "Decompensated cirrhosis (1-year survival ~45%, 2-year survival ~35%, perioperative abdominal mortality ~70–80%)";
    }
  }

  // 19. MELD-Na Score for End-Stage Liver Disease (OPTN/UNOS)
  let meldScore = null;
  let meldMortality = "";
  const meldBiliNum = parseFloat(meldBilirubin);
  const meldCrNum = parseFloat(meldCreatinine);
  const meldInrNum = parseFloat(meldInr);
  const meldNaNum = parseFloat(meldSodium);

  if (
    !isNaN(meldBiliNum) && meldBiliNum >= 0.1 && meldBiliNum <= 50.0 &&
    (meldDialysis || (!isNaN(meldCrNum) && meldCrNum >= 0.1 && meldCrNum <= 15.0)) &&
    !isNaN(meldInrNum) && meldInrNum >= 0.5 && meldInrNum <= 10.0 &&
    !isNaN(meldNaNum) && meldNaNum >= 100 && meldNaNum <= 160
  ) {
    const crCalc = meldDialysis ? 4.0 : Math.max(1.0, Math.min(4.0, meldCrNum));
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

    if (meldScore <= 9) {
      meldMortality = "Low risk (~1.9% 90-day mortality)";
    } else if (meldScore <= 19) {
      meldMortality = "Intermediate risk (~6.0% 90-day mortality)";
    } else if (meldScore <= 29) {
      meldMortality = "High risk (~19.6% 90-day mortality)";
    } else if (meldScore <= 39) {
      meldMortality = "Very high risk (~52.6% 90-day mortality)";
    } else {
      meldMortality = "Critical risk (~71.3% 90-day mortality)";
    }
  }

  // 20. Modified Centor (McIsaac) Score for Pharyngitis
  let centorScore = 0;
  if (centorTonsils) centorScore += 1;
  if (centorNodes) centorScore += 1;
  if (centorFever) centorScore += 1;
  if (centorNoCough) centorScore += 1;
  if (centorAgeGroup === "3to14") centorScore += 1;
  else if (centorAgeGroup === "45plus") centorScore -= 1;

  let centorStratification = "";
  if (centorScore <= 1) {
    centorStratification = "Low risk (1–10% streptococcal probability; throat culture or antibiotic typically not indicated)";
  } else if (centorScore === 2) {
    centorStratification = "Intermediate risk (11–17% probability; throat culture or rapid antigen test [RADT] recommended; treat only if positive)";
  } else if (centorScore === 3) {
    centorStratification = "Moderate to high risk (28–35% probability; throat culture or RADT recommended; treat only if positive)";
  } else {
    centorStratification = "High risk (51–53% probability; RADT or throat culture recommended; consider empiric antibiotic per clinical judgment)";
  }

  // 21. HEART Score for Major Adverse Cardiac Events (MACE)
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
    heartStratification = "Low risk (~0.9–1.7% 6-week MACE risk; early discharge / outpatient workup candidate)";
  } else if (heartScore <= 6) {
    heartStratification = "Intermediate risk (~12–16.6% 6-week MACE risk; observation and serial troponins recommended)";
  } else {
    heartStratification = "High risk (~50–65% 6-week MACE risk; urgent admission, cardiology consult, and early invasive angiography)";
  }

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

        <p className="muted small-text">Educational estimates only. The 4-2-1 fluid example is pediatric; other tools are for adults. These values cannot diagnose a condition or determine treatment. Confirm measurements and interpretation with a qualified clinician.</p>
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
                CHA₂DS₂-VASc is one input used in atrial fibrillation risk discussions. This score alone does not estimate a person&apos;s annual stroke risk or determine medication.
              </p>
              <div className="chads-checklist">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={chadsChf}
                    onChange={(e) => setChadsChf(e.target.checked)}
                  />
                  <span><strong>C</strong>ongestive heart failure or LVEF ≤ 40% (+1)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={chadsHtn}
                    onChange={(e) => setChadsHtn(e.target.checked)}
                  />
                  <span><strong>H</strong>ypertension history or treatment (+1)</span>
                </label>
                <label>
                  <strong>A</strong>ge Category
                  <select value={chadsAgeGroup} onChange={(e) => setChadsAgeGroup(e.target.value)}>
                    <option value="under65">&lt; 65 years (+0)</option>
                    <option value="65to74">65–74 years (+1)</option>
                    <option value="75plus">≥ 75 years (+2)</option>
                  </select>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={chadsDm}
                    onChange={(e) => setChadsDm(e.target.checked)}
                  />
                  <span><strong>D</strong>iabetes mellitus (+1)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={chadsStroke}
                    onChange={(e) => setChadsStroke(e.target.checked)}
                  />
                  <span><strong>S</strong>troke, TIA, or prior thromboembolism (+2)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={chadsVascular}
                    onChange={(e) => setChadsVascular(e.target.checked)}
                  />
                  <span><strong>V</strong>ascular disease (prior MI, PAD, aortic plaque) (+1)</span>
                </label>
                <label>
                  <strong>S</strong>ex Category
                  <select value={chadsSex} onChange={(e) => setChadsSex(e.target.value)}>
                    <option value="female">Female (+1)</option>
                    <option value="male">Male (+0)</option>
                  </select>
                </label>
              </div>

              <div className="calc-result">
                <div className="calc-result-metric">
                  <strong>Score: {chadsScore}</strong>
                  <span className="badge">Risk factors counted</span>
                </div>
                <p className="small-text muted">
                  Treatment decisions depend on the full clinical picture, bleeding risk, and patient preferences. <a href="https://www.ahajournals.org/doi/10.1161/CIR.0000000000001193" target="_blank" rel="noopener noreferrer">ACC/AHA guideline</a>.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    onClick={() =>
                      insertAndClose(
                          `For educational purposes, explain what a CHA2DS2-VASc score of ${chadsScore} represents, its limits, and what a clinician considers when discussing stroke prevention.`
                      )
                    }
                  >
                    Ask MedAssist about this score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() =>
                        handleCopy(`CHA2DS2-VASc score: ${chadsScore} (risk factors counted; not an individual risk estimate or treatment recommendation)`)
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
              <div className="chads-checklist">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={wellsDvtSymptoms}
                    onChange={(e) => setWellsDvtSymptoms(e.target.checked)}
                  />
                  <span>Clinical signs and symptoms of DVT (leg swelling and pain with palpation) (+3.0)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={wellsPeLikely}
                    onChange={(e) => setWellsPeLikely(e.target.checked)}
                  />
                  <span>An alternative diagnosis is less likely than PE (+3.0)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={wellsTachycardia}
                    onChange={(e) => setWellsTachycardia(e.target.checked)}
                  />
                  <span>Heart rate &gt; 100 beats/min (tachycardia) (+1.5)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={wellsImmobilization}
                    onChange={(e) => setWellsImmobilization(e.target.checked)}
                  />
                  <span>Immobilization (≥ 3 days bed rest) or surgery in previous 4 weeks (+1.5)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={wellsPriorDvtPe}
                    onChange={(e) => setWellsPriorDvtPe(e.target.checked)}
                  />
                  <span>Previous objectively diagnosed PE or DVT (+1.5)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={wellsHemoptysis}
                    onChange={(e) => setWellsHemoptysis(e.target.checked)}
                  />
                  <span>Hemoptysis (coughing up blood) (+1.0)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={wellsMalignancy}
                    onChange={(e) => setWellsMalignancy(e.target.checked)}
                  />
                  <span>Malignancy (active treatment within 6 months or palliative) (+1.0)</span>
                </label>
              </div>

              <div className="calc-result">
                <div className="calc-result-metric">
                  <strong>{wellsFormatted} points</strong>
                  <span className="badge">{wellsScoreBand}</span>
                </div>
                <p className="small-text">
                  The score band is a reference to the NICE two-level pathway, not a personal risk percentage or a diagnosis.
                </p>
                <p className="small-text muted">
                  An unchecked item means only that it was not selected; it does not mean the finding is absent. A clinician must assess the criteria and decide on further testing. Suspected PE is a potential medical emergency. <a href="https://www.nice.org.uk/guidance/ng158/chapter/Recommendations" target="_blank" rel="noopener noreferrer">Read the NICE PE pathway</a>.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
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
                    onClick={() =>
                      handleCopy(
                        `Wells' PE teaching example: ${wellsFormatted} points (${wellsScoreBand}; unchecked items are unassessed, not absent; not diagnostic guidance)`
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
                CURB-65 is an established risk-stratification score assessing 30-day mortality in adults with community-acquired pneumonia (CAP).
              </p>
              <div className="chads-checklist">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={curbConfusion}
                    onChange={(e) => setCurbConfusion(e.target.checked)}
                  />
                  <span><strong>C</strong>onfusion (new mental confusion or AMTS ≤ 8) (+1)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={curbUrea}
                    onChange={(e) => setCurbUrea(e.target.checked)}
                  />
                  <span><strong>U</strong>rea &gt; 19 mg/dL (&gt; 7 mmol/L / BUN &gt; 19 mg/dL) (+1)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={curbRespiratory}
                    onChange={(e) => setCurbRespiratory(e.target.checked)}
                  />
                  <span><strong>R</strong>espiratory rate ≥ 30 breaths/min (+1)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={curbBp}
                    onChange={(e) => setCurbBp(e.target.checked)}
                  />
                  <span><strong>B</strong>lood pressure low (SBP &lt; 90 mmHg OR DBP ≤ 60 mmHg) (+1)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={curbAge65}
                    onChange={(e) => setCurbAge65(e.target.checked)}
                  />
                  <span>Age ≥ <strong>65</strong> years (+1)</span>
                </label>
              </div>

              <div className="calc-result">
                <div className="calc-result-metric">
                  <strong>{curbScore} / 5 points</strong>
                  <span className="badge">{curbStratification}</span>
                </div>
                <p className="small-text">
                  Educational risk stratification only. CURB-65 does not determine clinical disposition, triage, or antimicrobial therapy.
                </p>
                <p className="small-text muted">
                  An unchecked item indicates it was not selected, not that it has been ruled out. Clinicians evaluate oxygen saturation, social support, and clinical stability alongside CURB-65. Respiratory distress, hypoxia, or sepsis is a medical emergency. <a href="https://www.brit-thoracic.org.uk" target="_blank" rel="noopener noreferrer">BTS guidelines</a>.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain how a CURB-65 pneumonia score of ${curbScore}/5 points (${curbStratification}) is interpreted in clinical guidelines, its limitations, and what clinical factors beyond CURB-65 guide hospital admission decisions.`
                      )
                    }
                  >
                    Ask MedAssist about this CURB-65 score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() =>
                      handleCopy(
                        `CURB-65 pneumonia score estimate: ${curbScore}/5 points (${curbStratification}; educational risk stratification only; not diagnostic or admission advice)`
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
                The Glasgow Coma Scale (GCS) provides a standardized, objective evaluation of level of consciousness following acute neurological injury.
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
                  <strong>{gcsScore} / 15 points (E{gcsEye}V{gcsVerbal}M{gcsMotor})</strong>
                  <span className="badge">{gcsStratification}</span>
                </div>
                <p className="small-text">
                  Educational tracking score only. GCS does not replace formal neurological assessment, pupillary exam, airway evaluation, or neuroimaging.
                </p>
                <p className="small-text muted">
                  Assess for confounders prior to scoring: intubation (often documented as V1T), sedation, paralytics, orbital trauma, hypothermia, shock, or language barriers. A GCS ≤ 8 signals critical loss of airway reflexes and severe brain injury. An acute decrease of ≥ 2 points is a medical emergency. <a href="https://www.glasgowcomascale.org" target="_blank" rel="noopener noreferrer">Glasgow Coma Scale guidelines</a>.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain how a Glasgow Coma Scale (GCS) score of ${gcsScore}/15 (E${gcsEye}V${gcsVerbal}M${gcsMotor} - ${gcsStratification}) is interpreted in emergency neurotrauma triage, the clinical significance of a GCS score ≤ 8 regarding airway protection, and how clinicians document confounding factors like intubation and sedation.`
                      )
                    }
                  >
                    Ask MedAssist about this GCS score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() =>
                      handleCopy(
                        `Glasgow Coma Scale (GCS) estimate: ${gcsScore}/15 (E${gcsEye}V${gcsVerbal}M${gcsMotor}; ${gcsStratification}; educational reference only; not diagnostic or triage advice)`
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
                The HAS-BLED score assesses 1-year major bleeding risk in patients receiving anticoagulation for non-valvular atrial fibrillation to identify and correct modifiable bleeding risk factors.
              </p>
              <div style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={hasbledHtn}
                    onChange={(e) => setHasbledHtn(e.target.checked)}
                  />
                  <span><strong>H: Hypertension</strong> (uncontrolled, systolic BP &gt; 160 mmHg) (+1)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={hasbledRenal}
                    onChange={(e) => setHasbledRenal(e.target.checked)}
                  />
                  <span><strong>A: Abnormal renal function</strong> (dialysis, renal transplant, or Cr &ge; 2.26 mg/dL / 200 &mu;mol/L) (+1)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={hasbledLiver}
                    onChange={(e) => setHasbledLiver(e.target.checked)}
                  />
                  <span><strong>A: Abnormal liver function</strong> (cirrhosis or bilirubin &gt; 2&times; ULN with AST/ALT/ALP &gt; 3&times; ULN) (+1)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={hasbledStroke}
                    onChange={(e) => setHasbledStroke(e.target.checked)}
                  />
                  <span><strong>S: Stroke history</strong> (prior ischemic or hemorrhagic stroke) (+1)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={hasbledBleeding}
                    onChange={(e) => setHasbledBleeding(e.target.checked)}
                  />
                  <span><strong>B: Bleeding history or predisposition</strong> (prior major bleeding, severe anemia, thrombocytopenia) (+1)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={hasbledLabileInr}
                    onChange={(e) => setHasbledLabileInr(e.target.checked)}
                  />
                  <span><strong>L: Labile INRs</strong> (unstable, high, or time in therapeutic range TTR &lt; 60% on VKA) (+1)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={hasbledElderly}
                    onChange={(e) => setHasbledElderly(e.target.checked)}
                  />
                  <span><strong>E: Elderly</strong> (age &gt; 65 years) (+1)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={hasbledDrugs}
                    onChange={(e) => setHasbledDrugs(e.target.checked)}
                  />
                  <span><strong>D: Drugs concomitantly</strong> (antiplatelets, NSAIDs) (+1)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={hasbledAlcohol}
                    onChange={(e) => setHasbledAlcohol(e.target.checked)}
                  />
                  <span><strong>D: Alcohol excess</strong> (&ge; 8 alcoholic drinks per week) (+1)</span>
                </label>
              </div>

              <div className="calc-result">
                <div className="calc-result-metric">
                  <strong>{hasbledScore} / 9 points</strong>
                  <span className="badge">{hasbledStratification}</span>
                </div>
                <p className="small-text">
                  Educational risk estimate only. A high HAS-BLED score (&ge; 3) is not an absolute reason to withhold oral anticoagulation; rather, it prompts identification and correction of modifiable bleeding risk factors and schedules more frequent clinical follow-up.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain how a HAS-BLED score of ${hasbledScore}/9 points (${hasbledStratification}) is interpreted in atrial fibrillation anticoagulation management, which modifiable bleeding risk factors clinicians target, and why guidelines emphasize that high bleeding risk scores should not automatically lead to withholding needed stroke thromboprophylaxis.`
                      )
                    }
                  >
                    Ask MedAssist about this HAS-BLED score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() =>
                      handleCopy(
                        `HAS-BLED bleeding risk score estimate: ${hasbledScore}/9 points (${hasbledStratification}; educational risk estimate only; not diagnostic or prescriptive advice)`
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
                The Quick Sepsis-related Organ Failure Assessment (qSOFA) is an educational bedside screening tool used to identify adult patients with suspected infection outside the ICU who are at high risk of in-hospital mortality.
              </p>
              <div style={{ display: "grid", gap: "10px", marginBottom: "14px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={qsofaMental}
                    onChange={(e) => setQsofaMental(e.target.checked)}
                  />
                  <span><strong>Altered Mental Status</strong> (Glasgow Coma Scale &lt; 15) (+1)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={qsofaResp}
                    onChange={(e) => setQsofaResp(e.target.checked)}
                  />
                  <span><strong>Tachypnea</strong> (Respiratory rate &ge; 22 breaths/min) (+1)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={qsofaBp}
                    onChange={(e) => setQsofaBp(e.target.checked)}
                  />
                  <span><strong>Hypotension</strong> (Systolic blood pressure &le; 100 mmHg) (+1)</span>
                </label>
              </div>

              <div className="calc-result">
                <div className="calc-result-metric">
                  <strong>{qsofaScore} / 3 points</strong>
                  <span className="badge">{qsofaStratification}</span>
                </div>
                <p className="small-text">
                  Educational screening estimate only. A positive qSOFA (&ge; 2 points) suggests a high risk of poor outcome in suspected infection, prompting immediate bedside clinical assessment for acute organ dysfunction, measuring serum lactate, obtaining blood cultures, and initiating timely sepsis management protocols. It is not a diagnostic test for sepsis or septic shock.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain how a qSOFA score of ${qsofaScore}/3 points (${qsofaStratification}) is interpreted according to the Sepsis-3 consensus guidelines, how qSOFA differs from the full SOFA score and SIRS criteria, and what immediate diagnostic and resuscitation steps are prioritized in suspected sepsis.`
                      )
                    }
                  >
                    Ask MedAssist about this qSOFA score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() =>
                      handleCopy(
                        `qSOFA sepsis screening estimate: ${qsofaScore}/3 points (${qsofaStratification}; educational screening estimate only; not diagnostic or treatment advice)`
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
                The AST to Platelet Ratio Index (APRI) is a non-invasive biomarker index for assessing hepatic fibrosis and cirrhosis in patients with chronic liver disease (e.g., chronic hepatitis C, NAFLD/MASLD): [(AST / AST ULN) / Platelet Count (10⁹/L)] × 100.
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
                    <span className="badge">{apriStratification}</span>
                  </div>
                  <p className="small-text">
                    APRI ≤ 0.50 offers high negative predictive value to rule out significant fibrosis; APRI &gt; 1.00 indicates high probability of significant fibrosis (METAVIR F2–F4); APRI &gt; 1.50 indicates high probability of cirrhosis (METAVIR F4).
                  </p>
                  <p className="small-text muted">
                    Educational screening estimate only. APRI does not replace liver biopsy, transient elastography (FibroScan), or direct clinical evaluation by a gastroenterologist/hepatologist.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain how an AST to Platelet Ratio Index (APRI) score of ${apriVal} (${apriStratification}) is interpreted in chronic liver disease evaluation, how APRI compares to FIB-4 and transient elastography (FibroScan), and which clinical follow-up is indicated.`
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
                          `AST to Platelet Ratio Index (APRI) estimate: score ${apriVal} (${apriStratification}; educational estimate only; not diagnostic or treatment advice)`
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

          {/* TAB 18: Child-Pugh Score for Cirrhosis Mortality */}
          {activeTab === "childpugh" && (
            <div id="tabpanel-childpugh" role="tabpanel" aria-labelledby="tab-childpugh" className="calc-pane">
              <p className="small-text muted">
                The Child-Pugh (Child-Turcotte-Pugh / CTP) score is a classic clinical staging and prognostic system for assessing the severity of cirrhosis, 1- to 2-year survival probability, and perioperative surgical mortality risk.
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
                  <p className="small-text">{cpInterpretation}</p>
                  <p className="small-text muted">
                    Educational prognostic estimate only. Ascites and encephalopathy assessments involve clinical subjectivity. Organ allocation for liver transplantation in the US (UNOS) is primarily directed by the MELD-Na score rather than Child-Pugh alone.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain how a Child-Pugh score of ${cpScore} points (${cpClass}: ${cpInterpretation}) is interpreted in chronic liver disease prognosis, how it guides elective surgery risk evaluation, and why MELD-Na is preferred for transplant prioritization.`
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
                          `Child-Pugh Cirrhosis Mortality Score: ${cpScore} points (${cpClass}; educational estimate only; not clinical or surgical advice)`
                        )
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="muted small-text" style={{ marginTop: "12px" }}>
                  Please enter valid Bilirubin (0.1–50 mg/dL), Albumin (0.5–6.0 g/dL), and INR (0.5–10.0).
                </p>
              )}
            </div>
          )}

          {/* TAB 19: MELD-Na (Model for End-Stage Liver Disease) */}
          {activeTab === "meld" && (
            <div id="tabpanel-meld" role="tabpanel" aria-labelledby="tab-meld" className="calc-pane">
              <p className="small-text muted">
                The Model for End-Stage Liver Disease with Sodium (MELD-Na / OPTN 2016) is the standard objective prognostic score used for liver transplant allocation and estimating 90-day pre-transplant mortality in adult patients with end-stage chronic liver disease.
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
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="15.0"
                    value={meldCreatinine}
                    disabled={meldDialysis}
                    onChange={(e) => setMeldCreatinine(e.target.value)}
                  />
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
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={meldDialysis}
                    onChange={(e) => setMeldDialysis(e.target.checked)}
                  />
                  <span>Dialysis history: 2 or more dialysis treatments in the past 7 days (sets creatinine to 4.0 mg/dL per UNOS policy)</span>
                </label>
              </div>

              {meldScore !== null ? (
                <div className="calc-result">
                  <div className="calc-result-metric">
                    <strong>Score: {meldScore} points</strong>
                    <span className="badge">{meldMortality}</span>
                  </div>
                  <p className="small-text">
                    Calculated using standard UNOS/OPTN MELD-Na equation (scores 6 to 40). Lower serum sodium reflects refractory ascites and hypervolemic hyponatremia, elevating estimated mortality risk when initial MELD &gt; 11.
                  </p>
                  <p className="small-text muted">
                    Educational prognostic estimate only. Organ allocation priority and MELD exception points (e.g. for hepatocellular carcinoma, hepatopulmonary syndrome, or refractory encephalopathy) are governed strictly by the OPTN/UNOS review board and require formal clinical listing.
                  </p>
                  <div className="actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() =>
                        insertAndClose(
                          `For educational purposes, explain how a MELD-Na score of ${meldScore} points (${meldMortality}) is interpreted in end-stage liver disease prognosis, how UNOS/OPTN utilizes MELD-Na for liver transplant waitlist prioritization, and why serum sodium was incorporated into the classic MELD score.`
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
                          `MELD-Na Liver Disease Prognosis Score: ${meldScore} points (${meldMortality}; UNOS/OPTN educational estimate; not clinical transplant listing guidance)`
                        )
                      }
                    >
                      {copied ? "Copied" : "Copy result"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="muted small-text" style={{ marginTop: "12px" }}>
                  Please enter valid Bilirubin (0.1–50 mg/dL), Creatinine (0.1–15 mg/dL), INR (0.5–10.0), and Sodium (100–160 mEq/L).
                </p>
              )}
            </div>
          )}

          {/* TAB 20: Modified Centor (McIsaac) Score */}
          {activeTab === "centor" && (
            <div id="tabpanel-centor" role="tabpanel" aria-labelledby="tab-centor" className="calc-pane">
              <p className="small-text muted">
                The Modified Centor Score (McIsaac Criteria) stratifies the probability of Group A Streptococcal (GAS) pharyngitis in patients presenting with acute sore throat, helping guide decision-making on rapid antigen detection testing (RADT) or throat culture and reducing unnecessary antibiotic use.
              </p>
              <div className="checkbox-grid" style={{ marginBottom: "16px" }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={centorTonsils}
                    onChange={(e) => setCentorTonsils(e.target.checked)}
                  />
                  <span>Tonsillar exudate or swelling (+1)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={centorNodes}
                    onChange={(e) => setCentorNodes(e.target.checked)}
                  />
                  <span>Tender or swollen anterior cervical lymph nodes (+1)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={centorFever}
                    onChange={(e) => setCentorFever(e.target.checked)}
                  />
                  <span>History of fever &gt; 38°C (100.4°F) (+1)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={centorNoCough}
                    onChange={(e) => setCentorNoCough(e.target.checked)}
                  />
                  <span>Absence of cough (+1)</span>
                </label>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="centor-age-select" style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>
                  Age group (McIsaac criteria)
                  <select
                    id="centor-age-select"
                    aria-label="Age group (McIsaac criteria)"
                    value={centorAgeGroup}
                    onChange={(e) => setCentorAgeGroup(e.target.value)}
                  >
                    <option value="3to14">3 to 14 years old (+1)</option>
                    <option value="15to44">15 to 44 years old (0)</option>
                    <option value="45plus">45 years and older (-1)</option>
                  </select>
                </label>
              </div>

              <div className="calc-result">
                <div className="calc-result-metric">
                  <strong>Score: {centorScore} {centorScore === 1 ? "point" : "points"}</strong>
                  <span className="badge">{centorStratification}</span>
                </div>
                <p className="small-text">
                  Scores range from -1 to 5. Antibiotic stewardship guidelines (IDSA / CDC) recommend microbiological confirmation (RADT or throat culture) before antibiotic therapy for scores &ge; 2, and no testing or antibiotic treatment for scores &le; 1 (viral etiology predominant).
                </p>
                <p className="small-text muted">
                  Educational guidance only. Does not substitute for clinical examination or microbiological swab results. Patients younger than 3 years have low incidence of GAS pharyngitis and rheumatic fever, so criteria are validated for ages 3 and above.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain how a Modified Centor / McIsaac score of ${centorScore} points (${centorStratification}) is applied in the evaluation of acute pharyngitis, what the IDSA guidelines recommend regarding rapid antigen testing vs throat culture, and how antibiotic stewardship helps prevent overtreatment of viral pharyngitis.`
                      )
                    }
                  >
                    Ask MedAssist about this Centor score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() =>
                      handleCopy(
                        `Modified Centor (McIsaac) Strep Score: ${centorScore} points (${centorStratification}; educational estimate only; not diagnostic or treatment recommendation)`
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
                    <option value="normal">&le; Normal reference limit (0 points)</option>
                    <option value="one_to_three">1 to 3&times; normal limit (+1 point)</option>
                    <option value="greater_three">&gt; 3&times; normal limit (+2 points)</option>
                  </select>
                </label>
              </div>

              <div className="calc-result" style={{ marginTop: "16px" }}>
                <div className="calc-result-metric">
                  <strong>Score: {heartScore} {heartScore === 1 ? "point" : "points"}</strong>
                  <span className="badge">{heartStratification}</span>
                </div>
                <p className="small-text">
                  Scores range from 0 to 10 points. Developed and validated to safely identify low-risk emergency patients who may be managed without urgent hospitalization, while identifying high-risk individuals requiring prompt coronary intervention.
                </p>
                <p className="small-text muted">
                  Educational prognostic tool only. Any acute or crushing chest pain, diaphoresis, dyspnea, or suspected STEMI requires immediate emergency medical services (call 911). Never use this calculator to delay acute emergency care.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button small"
                    onClick={() =>
                      insertAndClose(
                        `For educational purposes, explain how a HEART Score of ${heartScore} points (${heartStratification}) is interpreted in emergency chest pain triage, what clinical pathways are recommended for each risk tier, and how serial high-sensitivity troponin assays have influenced the HEART pathway.`
                      )
                    }
                  >
                    Ask MedAssist about this HEART score
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() =>
                      handleCopy(
                        `HEART Chest Pain MACE Score: ${heartScore} points (${heartStratification}; educational estimate only; not diagnostic or emergency triage advice)`
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
