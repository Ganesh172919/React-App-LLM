import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ClinicalCalculatorsModal from "../components/tools/ClinicalCalculatorsModal";

afterEach(cleanup);

it("treats a single eGFR as an estimate and rejects out-of-range age", () => {
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={vi.fn()} />);
  fireEvent.click(screen.getByRole("tab", { name: "eGFR (CKD-EPI)" }));
  expect(screen.getByText(/single eGFR does not diagnose chronic kidney disease/)).toBeTruthy();
  expect(screen.getByText("GFR category G3a")).toBeTruthy();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Age (years)" }), { target: { value: "15" } });
  expect(screen.queryByText("GFR category G3a")).toBeNull();
});

it("keeps score and pressure calculators free of treatment conclusions", () => {
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={vi.fn()} />);
  fireEvent.click(screen.getByRole("tab", { name: "CHA₂DS₂-VASc" }));
  expect(screen.getByText("Score: 1")).toBeTruthy();
  expect(screen.getByText(/does not estimate a person's annual stroke risk/)).toBeTruthy();
  expect(screen.queryByText(/benefit from oral anticoagulation/)).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: "MAP / Perfusion" }));
  expect(screen.getByText(/cannot establish organ perfusion/)).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "CrCl (Cockcroft-Gault)" }));
  expect(screen.getByText(/cannot determine a medication dose/)).toBeTruthy();
});

it("calculates corrected calcium without clinical diagnostic claims", () => {
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={vi.fn()} />);
  fireEvent.click(screen.getByRole("tab", { name: "Corrected Calcium" }));
  expect(screen.getByText(/Payne equation for hypoalbuminemia/)).toBeTruthy();
  expect(screen.getByText("9.2 mg/dL")).toBeTruthy();
  expect(screen.getByText("Typical reference (8.5–10.5 mg/dL)")).toBeTruthy();
  expect(screen.getByText(/This cannot diagnose hypercalcemia or hypocalcemia/)).toBeTruthy();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Total Measured Calcium (mg/dL)" }), { target: { value: "2.0" } });
  expect(screen.queryByText("9.2 mg/dL")).toBeNull();
});

it("calculates serum anion gap without clinical diagnostic claims and validates input bounds", () => {
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={vi.fn()} />);
  fireEvent.click(screen.getByRole("tab", { name: "Serum Anion Gap" }));
  expect(screen.getByText(/Evaluates unmeasured anions in serum/)).toBeTruthy();
  expect(screen.getByText("12 mEq/L")).toBeTruthy();
  expect(screen.getByText("Typical reference range (8–12 mEq/L)")).toBeTruthy();
  expect(screen.getByText(/A calculated anion gap cannot diagnose metabolic acidosis/)).toBeTruthy();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Sodium (Na⁺) (mEq/L)" }), { target: { value: "80" } });
  expect(screen.queryByText("12 mEq/L")).toBeNull();
});

it("calculates fractional excretion of sodium (FeNa) without clinical diagnostic claims and validates input bounds", () => {
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={vi.fn()} />);
  fireEvent.click(screen.getByRole("tab", { name: "FeNa (Fractional Excretion of Na)" }));
  expect(screen.getByText(/Fractional Excretion of Sodium \(FeNa\)/)).toBeTruthy();
  expect(screen.getByText("0.21%")).toBeTruthy();
  expect(screen.getByText("Below 1%")).toBeTruthy();
  expect(screen.getByText(/No value alone establishes the cause of kidney injury/)).toBeTruthy();
  expect(screen.queryByText(/volume responsive/)).toBeNull();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Serum Sodium (Na⁺) (mEq/L)" }), { target: { value: "50" } });
  expect(screen.queryByText("0.21%")).toBeNull();
});

it("calculates fractional excretion of urea (FeUrea) without clinical diagnostic claims and validates input bounds", () => {
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={vi.fn()} />);
  fireEvent.click(screen.getByRole("tab", { name: "FeUrea (on Diuretics)" }));
  expect(screen.getByText(/Fractional Excretion of Urea \(FeUrea\)/)).toBeTruthy();
  expect(screen.getByText("25%")).toBeTruthy();
  expect(screen.getByText("Below 35%")).toBeTruthy();
  expect(screen.getByText(/35%–50% is an indeterminate range/)).toBeTruthy();
  expect(screen.queryByText(/acute tubular injury/)).toBeNull();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Serum BUN (mg/dL)" }), { target: { value: "2" } });
  expect(screen.queryByText("25%")).toBeNull();
});

it("shows the pediatric 4-2-1 example without presenting a patient order", () => {
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={vi.fn()} />);
  fireEvent.click(screen.getByRole("tab", { name: "Pediatric 4-2-1 fluid example" }));
  expect(screen.getByText(/Pediatric teaching example of the Holliday-Segar 4-2-1 rule/)).toBeTruthy();
  expect(screen.getByText("60 mL/hr")).toBeTruthy();
  expect(screen.getByText("1,440 mL / 24 hours")).toBeTruthy();
  expect(screen.getByText(/not a patient order/)).toBeTruthy();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Example pediatric weight (kg)" }), { target: { value: "15" } });
  expect(screen.getByText("50 mL/hr")).toBeTruthy();
  expect(screen.getByText("1,200 mL / 24 hours")).toBeTruthy();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Example pediatric weight (kg)" }), { target: { value: "0" } });
  expect(screen.queryByText("50 mL/hr")).toBeNull();
});

it("calculates Wells' Criteria for Pulmonary Embolism without diagnostic claims and updates score dynamically", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);
  fireEvent.click(screen.getByRole("tab", { name: "Wells' Criteria (PE)" }));
  expect(screen.getByText(/A low score alone cannot rule out PE/)).toBeTruthy();
  expect(screen.getByText("0 points")).toBeTruthy();
  expect(screen.getByText("NICE score band: 4 or less")).toBeTruthy();
  expect(screen.getByText(/An unchecked item means only that it was not selected/)).toBeTruthy();
  expect(screen.queryByText(/3.6% PE risk/)).toBeNull();

  // Toggle DVT symptoms (+3.0) and Heart rate > 100 bpm (+1.5)
  fireEvent.click(screen.getByLabelText(/Clinical signs and symptoms of DVT/));
  fireEvent.click(screen.getByLabelText(/Heart rate > 100 beats\/min/));
  expect(screen.getByText("4.5 points")).toBeTruthy();
  expect(screen.getByText("NICE score band: above 4")).toBeTruthy();

  // Toggle alternative diagnosis less likely (+3.0) -> total 7.5
  fireEvent.click(screen.getByLabelText(/An alternative diagnosis is less likely than PE/));
  expect(screen.getByText("7.5 points")).toBeTruthy();
  expect(screen.queryByText(/66.7% PE risk/)).toBeNull();

  // Check prompt insertion
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this Wells score" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const promptCall = onInsertPrompt.mock.calls[0][0];
  expect(promptCall).toContain("7.5 points");
  expect(promptCall).toContain("Do not rule out PE");
});

it("calculates CURB-65 Pneumonia Severity Score without diagnostic claims and updates score dynamically", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);
  fireEvent.click(screen.getByRole("tab", { name: "CURB-65 (Pneumonia)" }));
  expect(screen.getByText(/assessing 30-day mortality in adults with community-acquired pneumonia/)).toBeTruthy();
  expect(screen.getByText("0 / 5 points")).toBeTruthy();
  expect(screen.getByText(/Low risk \(30-day mortality < 3%\)/)).toBeTruthy();
  expect(screen.getByText(/does not determine clinical disposition/)).toBeTruthy();

  // Toggle Confusion (+1) and Respiratory rate (+1)
  fireEvent.click(screen.getByLabelText(/Confusion \(new mental confusion/));
  fireEvent.click(screen.getByLabelText(/Respiratory rate ≥ 30 breaths\/min/));
  expect(screen.getByText("2 / 5 points")).toBeTruthy();
  expect(screen.getByText(/Moderate risk \(30-day mortality ~9%\)/)).toBeTruthy();

  // Toggle Urea (+1) and Age >= 65 (+1) -> total 4 / 5
  fireEvent.click(screen.getByLabelText(/Urea > 19 mg\/dL/));
  fireEvent.click(screen.getByLabelText(/Age ≥ 65 years/));
  expect(screen.getByText("4 / 5 points")).toBeTruthy();
  expect(screen.getByText(/High \/ severe risk/)).toBeTruthy();

  // Check prompt insertion
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this CURB-65 score" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const promptCall = onInsertPrompt.mock.calls[0][0];
  expect(promptCall).toContain("4/5 points");
  expect(promptCall).toContain("CURB-65 pneumonia score");
});

it("calculates Glasgow Coma Scale (GCS) without diagnostic claims and updates score dynamically", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);
  fireEvent.click(screen.getByRole("tab", { name: "GCS (Coma Scale)" }));
  expect(screen.getByText(/objective evaluation of level of consciousness/)).toBeTruthy();
  expect(screen.getByText("15 / 15 points (E4V5M6)")).toBeTruthy();
  expect(screen.getByText("Mild brain injury / Alert (13–15)")).toBeTruthy();
  expect(screen.getByText(/GCS does not replace formal neurological assessment/)).toBeTruthy();

  // Change Eye to 1 (None), Verbal to 1 (None), Motor to 1 (None)
  fireEvent.change(screen.getByLabelText(/Eye Opening Response \(E\)/), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText(/Verbal Response \(V\)/), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText(/Motor Response \(M\)/), { target: { value: "1" } });
  expect(screen.getByText("3 / 15 points (E1V1M1)")).toBeTruthy();
  expect(screen.getByText("Severe brain injury / Coma (3–8)")).toBeTruthy();

  // Change Motor to 5 (Localising) -> total 7 / 15
  fireEvent.change(screen.getByLabelText(/Motor Response \(M\)/), { target: { value: "5" } });
  expect(screen.getByText("7 / 15 points (E1V1M5)")).toBeTruthy();
  expect(screen.getByText("Severe brain injury / Coma (3–8)")).toBeTruthy();

  // Change Verbal to 4 (Confused), Eye to 3 (To sound) -> total 3+4+5 = 12 / 15 -> Moderate
  fireEvent.change(screen.getByLabelText(/Eye Opening Response \(E\)/), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText(/Verbal Response \(V\)/), { target: { value: "4" } });
  expect(screen.getByText("12 / 15 points (E3V4M5)")).toBeTruthy();
  expect(screen.getByText("Moderate brain injury (9–12)")).toBeTruthy();

  // Check prompt insertion
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this GCS score" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const promptCall = onInsertPrompt.mock.calls[0][0];
  expect(promptCall).toContain("12/15 (E3V4M5 - Moderate brain injury (9–12))");
  expect(promptCall).toContain("Glasgow Coma Scale");
});

it("calculates HAS-BLED bleeding risk score without diagnostic claims and updates score dynamically", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);
  fireEvent.click(screen.getByRole("tab", { name: "HAS-BLED (Bleeding Risk)" }));
  expect(screen.getByText(/assesses 1-year major bleeding risk in patients receiving anticoagulation/)).toBeTruthy();
  expect(screen.getByText("0 / 9 points")).toBeTruthy();
  expect(screen.getByText(/Low bleeding risk/)).toBeTruthy();
  expect(screen.getByText(/is not an absolute reason to withhold oral anticoagulation/)).toBeTruthy();

  // Toggle Hypertension (+1) and Abnormal renal function (+1) -> 2 / 9 -> Moderate
  fireEvent.click(screen.getByLabelText(/H: Hypertension/));
  fireEvent.click(screen.getByLabelText(/A: Abnormal renal function/));
  expect(screen.getByText("2 / 9 points")).toBeTruthy();
  expect(screen.getByText(/Moderate bleeding risk/)).toBeTruthy();

  // Toggle Stroke (+1) and Bleeding history (+1) -> 4 / 9 -> High
  fireEvent.click(screen.getByLabelText(/S: Stroke history/));
  fireEvent.click(screen.getByLabelText(/B: Bleeding history/));
  expect(screen.getByText("4 / 9 points")).toBeTruthy();
  expect(screen.getByText(/High bleeding risk/)).toBeTruthy();

  // Check prompt insertion
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this HAS-BLED score" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const promptCall = onInsertPrompt.mock.calls[0][0];
  expect(promptCall).toContain("4/9 points");
  expect(promptCall).toContain("HAS-BLED");
});

it("calculates qSOFA sepsis screening score without diagnostic claims and updates score dynamically", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);
  fireEvent.click(screen.getByRole("tab", { name: "qSOFA (Sepsis Screening)" }));
  expect(screen.getByText(/educational bedside screening tool used to identify adult patients with suspected infection/)).toBeTruthy();
  expect(screen.getByText("0 / 3 points")).toBeTruthy();
  expect(screen.getByText(/Not high risk for in-hospital sepsis mortality/)).toBeTruthy();
  expect(screen.getByText(/prompting immediate bedside clinical assessment for acute organ dysfunction/)).toBeTruthy();

  // Toggle Altered mental status (+1) and Tachypnea (+1) -> 2 / 3 -> High risk
  fireEvent.click(screen.getByLabelText(/Altered Mental Status/));
  fireEvent.click(screen.getByLabelText(/Tachypnea/));
  expect(screen.getByText("2 / 3 points")).toBeTruthy();
  expect(screen.getByText(/High risk for in-hospital sepsis mortality/)).toBeTruthy();

  // Toggle Hypotension (+1) -> 3 / 3
  fireEvent.click(screen.getByLabelText(/Hypotension/));
  expect(screen.getByText("3 / 3 points")).toBeTruthy();
  expect(screen.getByText(/High risk for in-hospital sepsis mortality/)).toBeTruthy();

  // Check prompt insertion
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this qSOFA score" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const promptCall = onInsertPrompt.mock.calls[0][0];
  expect(promptCall).toContain("3/3 points");
  expect(promptCall).toContain("qSOFA");
});

it("calculates Mosteller Body Surface Area (BSA) in metric and imperial units without diagnostic claims", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);
  fireEvent.click(screen.getByRole("tab", { name: "BSA (Mosteller)" }));
  expect(screen.getByText(/Mosteller formula is the widely utilized clinical standard for estimating Body Surface Area/)).toBeTruthy();
  expect(screen.getByText("1.84 m²")).toBeTruthy();
  expect(screen.getByText("Mosteller BSA")).toBeTruthy();
  expect(screen.getByText(/Educational reference only\. In oncology chemotherapy and critical care/)).toBeTruthy();

  // Switch to Imperial
  fireEvent.click(screen.getByRole("button", { name: "Imperial (in / lbs)" }));
  expect(screen.getByText("1.84 m²")).toBeTruthy();

  // Change imperial measurements: 72 inches, 180 lbs -> sqrt(72*180/3131) = sqrt(4.13925) = 2.03 m²
  fireEvent.change(screen.getByRole("spinbutton", { name: "Height (inches)" }), { target: { value: "72" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Weight (lbs)" }), { target: { value: "180" } });
  expect(screen.getByText("2.03 m²")).toBeTruthy();

  // Test input bounds rejection
  fireEvent.change(screen.getByRole("spinbutton", { name: "Weight (lbs)" }), { target: { value: "2" } });
  expect(screen.queryByText("2.03 m²")).toBeNull();
  expect(screen.getByText(/Please enter a valid height/)).toBeTruthy();

  // Restore and test prompt insertion
  fireEvent.change(screen.getByRole("spinbutton", { name: "Weight (lbs)" }), { target: { value: "180" } });
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this BSA" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const promptCall = onInsertPrompt.mock.calls[0][0];
  expect(promptCall).toContain("2.03 m²");
  expect(promptCall).toContain("Mosteller Body Surface Area (BSA)");
});

it("calculates AST to Platelet Ratio Index (APRI) with fibrosis risk stratification and input bounds", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);
  fireEvent.click(screen.getByRole("tab", { name: "APRI (Liver Fibrosis)" }));
  expect(screen.getByText(/AST to Platelet Ratio Index \(APRI\) is a non-invasive biomarker index/)).toBeTruthy();
  expect(screen.getByText("Score: 0.75")).toBeTruthy();
  expect(screen.getByText(/Indeterminate \/ intermediate fibrosis probability/)).toBeTruthy();

  // Test Low fibrosis probability (APRI <= 0.50): AST 20 -> ((20/40)/150)*100 = 0.33
  fireEvent.change(screen.getByRole("spinbutton", { name: "AST (Aspartate Aminotransferase) (U/L)" }), { target: { value: "20" } });
  expect(screen.getByText("Score: 0.33")).toBeTruthy();
  expect(screen.getByText(/Low probability of significant fibrosis/)).toBeTruthy();

  // Test High fibrosis probability (1.00 < APRI <= 1.50): AST 70 -> ((70/40)/150)*100 = 1.17
  fireEvent.change(screen.getByRole("spinbutton", { name: "AST (Aspartate Aminotransferase) (U/L)" }), { target: { value: "70" } });
  expect(screen.getByText("Score: 1.17")).toBeTruthy();
  expect(screen.getByText(/High probability of significant fibrosis/)).toBeTruthy();

  // Test Cirrhosis (APRI > 1.50): AST 120 -> ((120/40)/150)*100 = 2.00
  fireEvent.change(screen.getByRole("spinbutton", { name: "AST (Aspartate Aminotransferase) (U/L)" }), { target: { value: "120" } });
  expect(screen.getByText("Score: 2.00")).toBeTruthy();
  expect(screen.getByText(/High probability of cirrhosis/)).toBeTruthy();

  // Test input rejection out of bounds
  fireEvent.change(screen.getByRole("spinbutton", { name: "AST (Aspartate Aminotransferase) (U/L)" }), { target: { value: "2" } });
  expect(screen.queryByText("Score: 2.00")).toBeNull();
  expect(screen.getByText(/Please enter valid AST/)).toBeTruthy();

  // Restore and check prompt insertion
  fireEvent.change(screen.getByRole("spinbutton", { name: "AST (Aspartate Aminotransferase) (U/L)" }), { target: { value: "120" } });
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this APRI score" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const promptCall = onInsertPrompt.mock.calls[0][0];
  expect(promptCall).toContain("score of 2.00");
  expect(promptCall).toContain("APRI");
});

it("supports arrow key navigation across calculator tabs", () => {
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={vi.fn()} />);
  const bmiTab = screen.getByRole("tab", { name: "BMI" });
  bmiTab.focus();
  fireEvent.keyDown(bmiTab, { key: "ArrowRight" });
  const egfrTab = screen.getByRole("tab", { name: "eGFR (CKD-EPI)" });
  expect(egfrTab.getAttribute("aria-selected")).toBe("true");
  fireEvent.keyDown(egfrTab, { key: "ArrowLeft" });
  expect(bmiTab.getAttribute("aria-selected")).toBe("true");

  // Wrapping from last tab (APRI) to first (BMI) and back
  const apriTab = screen.getByRole("tab", { name: "APRI (Liver Fibrosis)" });
  apriTab.focus();
  fireEvent.keyDown(apriTab, { key: "ArrowRight" });
  expect(bmiTab.getAttribute("aria-selected")).toBe("true");
  fireEvent.keyDown(bmiTab, { key: "ArrowLeft" });
  expect(apriTab.getAttribute("aria-selected")).toBe("true");
});
