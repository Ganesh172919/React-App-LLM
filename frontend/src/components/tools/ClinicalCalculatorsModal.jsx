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
      const tabList = ["bmi", "egfr", "chads", "map", "crcl", "calcium", "aniongap", "fena", "feurea", "fluids", "wells", "curb65"];
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
        </div>
      </div>
    </div>
  );
}
