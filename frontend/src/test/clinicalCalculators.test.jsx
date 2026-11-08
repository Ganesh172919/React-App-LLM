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
  expect(screen.getByText("0 of 7 findings assessed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ask MedAssist about this score" }).disabled).toBe(true);
  expect(screen.getByText(/does not estimate a person's annual stroke risk/)).toBeTruthy();
  expect(screen.queryByText(/benefit from oral anticoagulation/)).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: "MAP / Perfusion" }));
  expect(screen.getByText(/cannot establish organ perfusion/)).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "CrCl (Cockcroft-Gault)" }));
  expect(screen.getByText(/cannot determine a medication dose/)).toBeTruthy();
});

it("requires all CHA₂DS₂-VASc findings before scoring or inserting a prompt", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);
  fireEvent.click(screen.getByRole("tab", { name: "CHA₂DS₂-VASc" }));
  const pane = screen.getByRole("tabpanel", { name: "CHA₂DS₂-VASc" });
  const fields = pane.querySelectorAll("select");
  expect(fields).toHaveLength(7);
  fireEvent.change(screen.getByLabelText(/Sex category used by this score/), { target: { value: "female" } });
  expect(screen.getByText("1 of 7 findings assessed")).toBeTruthy();
  expect(screen.queryByText("Score: 1")).toBeNull();
  for (const field of fields) {
    if (field.value === "unknown") fireEvent.change(field, { target: { value: field.id === "chads-age-select" ? "under65" : "absent" } });
  }
  expect(screen.getByText("Score: 1")).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/Age category/), { target: { value: "75plus" } });
  fireEvent.change(screen.getByLabelText(/Prior stroke, TIA/), { target: { value: "present" } });
  expect(screen.getByText("Score: 5")).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/Prior stroke, TIA/), { target: { value: "unknown" } });
  expect(screen.getByText("6 of 7 findings assessed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Copy result" }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Prior stroke, TIA/), { target: { value: "present" } });
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this score" }));
  expect(onInsertPrompt).toHaveBeenCalledWith(expect.stringContaining("5 points"));
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
  expect(screen.getByText("0 of 7 findings assessed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ask MedAssist about this Wells score" }).disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Copy result" }).disabled).toBe(true);
  expect(screen.getByText(/Unassessed findings cannot be counted as absent/)).toBeTruthy();
  expect(screen.queryByText(/3.6% PE risk/)).toBeNull();

  const fields = screen.getByRole("tabpanel", { name: "Wells' Criteria (PE)" }).querySelectorAll("select");
  for (const field of fields) fireEvent.change(field, { target: { value: "absent" } });
  expect(screen.getByText("0 points")).toBeTruthy();
  expect(screen.getByText("NICE score band: 4 or less")).toBeTruthy();

  fireEvent.change(screen.getByLabelText(/Clinical signs and symptoms of DVT/), { target: { value: "present" } });
  fireEvent.change(screen.getByLabelText(/Heart rate > 100 beats\/min/), { target: { value: "present" } });
  expect(screen.getByText("4.5 points")).toBeTruthy();
  expect(screen.getByText("NICE score band: above 4")).toBeTruthy();

  fireEvent.change(screen.getByLabelText(/An alternative diagnosis is less likely than PE/), { target: { value: "present" } });
  expect(screen.getByText("7.5 points")).toBeTruthy();
  expect(screen.queryByText(/66.7% PE risk/)).toBeNull();

  for (const field of fields) fireEvent.change(field, { target: { value: "present" } });
  expect(screen.getByText("12.5 points")).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/An alternative diagnosis is less likely than PE/), { target: { value: "absent" } });
  expect(screen.getByText("9.5 points")).toBeTruthy();

  fireEvent.change(screen.getByLabelText(/Heart rate > 100 beats\/min/), { target: { value: "unknown" } });
  expect(screen.getByText("6 of 7 findings assessed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Copy result" }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Heart rate > 100 beats\/min/), { target: { value: "present" } });
  fireEvent.change(screen.getByLabelText(/Immobilisation for more than 3 days/), { target: { value: "absent" } });
  fireEvent.change(screen.getByLabelText(/Previous DVT or PE/), { target: { value: "absent" } });
  fireEvent.change(screen.getByLabelText(/Haemoptysis/), { target: { value: "absent" } });
  fireEvent.change(screen.getByLabelText(/Malignancy/), { target: { value: "absent" } });
  fireEvent.change(screen.getByLabelText(/An alternative diagnosis is less likely than PE/), { target: { value: "present" } });

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
  expect(screen.getByText(/adults with diagnosed community-acquired pneumonia/)).toBeTruthy();
  expect(screen.getByText("0 of 5 findings assessed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ask MedAssist about this CURB-65 score" }).disabled).toBe(true);

  fireEvent.change(screen.getByLabelText(/New confusion or AMTS/), { target: { value: "present" } });
  fireEvent.change(screen.getByLabelText(/Respiratory rate ≥ 30 breaths\/min/), { target: { value: "present" } });
  expect(screen.getByText("2 of 5 findings assessed")).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/Blood urea nitrogen/), { target: { value: "absent" } });
  fireEvent.change(screen.getByLabelText(/Systolic BP/), { target: { value: "absent" } });
  fireEvent.change(screen.getByLabelText(/Age ≥ 65 years/), { target: { value: "absent" } });
  expect(screen.getByText("2 / 5 points")).toBeTruthy();
  expect(screen.getByText("2 point band")).toBeTruthy();

  fireEvent.change(screen.getByLabelText(/Blood urea nitrogen/), { target: { value: "present" } });
  fireEvent.change(screen.getByLabelText(/Age ≥ 65 years/), { target: { value: "present" } });
  expect(screen.getByText("4 / 5 points")).toBeTruthy();
  expect(screen.getByText("3–5 point band")).toBeTruthy();

  fireEvent.change(screen.getByLabelText(/Blood urea nitrogen/), { target: { value: "unknown" } });
  expect(screen.getByText("4 of 5 findings assessed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Copy result" }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Blood urea nitrogen/), { target: { value: "present" } });

  // Check prompt insertion
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this CURB-65 score" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const promptCall = onInsertPrompt.mock.calls[0][0];
  expect(promptCall).toContain("4/5 points");
  expect(promptCall).toContain("CURB-65 findings and limitations");
});

it("calculates Glasgow Coma Scale (GCS) without diagnostic claims and updates score dynamically", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);
  fireEvent.click(screen.getByRole("tab", { name: "GCS (Coma Scale)" }));
  expect(screen.getByText(/Select a response only when it has been observed/)).toBeTruthy();
  expect(screen.getByText("0 of 3 responses assessed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ask MedAssist about this GCS score" }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Verbal Response \(V\)/), { target: { value: "not_testable" } });
  expect(screen.getByText("Total unavailable: component not testable")).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/Eye Opening Response \(E\)/), { target: { value: "4" } });
  fireEvent.change(screen.getByLabelText(/Verbal Response \(V\)/), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText(/Motor Response \(M\)/), { target: { value: "6" } });
  expect(screen.getByText("15 / 15 points (E4V5M6)")).toBeTruthy();
  expect(screen.getByText("13–15 point band")).toBeTruthy();
  expect(screen.getByText(/cannot diagnose the cause or severity/)).toBeTruthy();

  // Change Eye to 1 (None), Verbal to 1 (None), Motor to 1 (None)
  fireEvent.change(screen.getByLabelText(/Eye Opening Response \(E\)/), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText(/Verbal Response \(V\)/), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText(/Motor Response \(M\)/), { target: { value: "1" } });
  expect(screen.getByText("3 / 15 points (E1V1M1)")).toBeTruthy();
  expect(screen.getByText("3–8 point band")).toBeTruthy();

  // Change Motor to 5 (Localising) -> total 7 / 15
  fireEvent.change(screen.getByLabelText(/Motor Response \(M\)/), { target: { value: "5" } });
  expect(screen.getByText("7 / 15 points (E1V1M5)")).toBeTruthy();
  expect(screen.getByText("3–8 point band")).toBeTruthy();

  // Change Verbal to 4 (Confused), Eye to 3 (To sound) -> total 3+4+5 = 12 / 15 -> Moderate
  fireEvent.change(screen.getByLabelText(/Eye Opening Response \(E\)/), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText(/Verbal Response \(V\)/), { target: { value: "4" } });
  expect(screen.getByText("12 / 15 points (E3V4M5)")).toBeTruthy();
  expect(screen.getByText("9–12 point band")).toBeTruthy();

  // Check prompt insertion
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this GCS score" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const promptCall = onInsertPrompt.mock.calls[0][0];
  expect(promptCall).toContain("12/15 (E3V4M5; 9–12 point band)");
  expect(promptCall).toContain("Glasgow Coma Scale");
});

it("calculates HAS-BLED bleeding risk score without diagnostic claims and updates score dynamically", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);
  fireEvent.click(screen.getByRole("tab", { name: "HAS-BLED (Bleeding Risk)" }));
  expect(screen.getByText(/records factors clinicians consider/)).toBeTruthy();
  expect(screen.getByText("0 of 9 findings assessed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ask MedAssist about this HAS-BLED score" }).disabled).toBe(true);
  const fields = screen.getByRole("tabpanel", { name: "HAS-BLED (Bleeding Risk)" }).querySelectorAll("select");
  expect(fields).toHaveLength(9);
  for (const field of fields) fireEvent.change(field, { target: { value: "absent" } });
  fireEvent.change(screen.getByLabelText(/Labile INR/), { target: { value: "not_applicable" } });
  expect(screen.getByText("0 / 9 points")).toBeTruthy();
  expect(screen.getByText("0–1 point band")).toBeTruthy();
  expect(screen.getByText(/cannot determine personal bleeding risk/)).toBeTruthy();

  fireEvent.change(screen.getByLabelText(/Uncontrolled hypertension/), { target: { value: "present" } });
  fireEvent.change(screen.getByLabelText(/Abnormal renal function/), { target: { value: "present" } });
  expect(screen.getByText("2 / 9 points")).toBeTruthy();
  expect(screen.getByText("2 point band")).toBeTruthy();

  fireEvent.change(screen.getByLabelText(/Prior stroke/), { target: { value: "present" } });
  fireEvent.change(screen.getByLabelText(/Bleeding history/), { target: { value: "present" } });
  expect(screen.getByText("4 / 9 points")).toBeTruthy();
  expect(screen.getByText("3–9 point band")).toBeTruthy();

  fireEvent.change(screen.getByLabelText(/Bleeding history/), { target: { value: "unknown" } });
  expect(screen.getByText("8 of 9 findings assessed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Copy result" }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Bleeding history/), { target: { value: "present" } });

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
  expect(screen.getByText(/must not be used alone to screen for or exclude sepsis/)).toBeTruthy();
  expect(screen.getByText("0 of 3 findings assessed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ask MedAssist about this qSOFA score" }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Altered mental status/i), { target: { value: "present" } });
  fireEvent.change(screen.getByLabelText(/Respiratory rate/i), { target: { value: "present" } });
  expect(screen.getByText("2 of 3 findings assessed")).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/Systolic blood pressure/i), { target: { value: "present" } });
  expect(screen.getByText("3 / 3 points")).toBeTruthy();
  expect(screen.getByText(/A low qSOFA count does not exclude sepsis/)).toBeTruthy();

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

it("calculates APRI only from entered labs without diagnosing fibrosis", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);
  fireEvent.click(screen.getByRole("tab", { name: "APRI (Liver Fibrosis)" }));
  expect(screen.getByText(/APRI is a laboratory index/)).toBeTruthy();
  expect(screen.queryByText(/Score: /)).toBeNull();
  fireEvent.change(screen.getByRole("spinbutton", { name: "AST Upper Limit of Normal (ULN) (U/L)" }), { target: { value: "40" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Platelet Count (10⁹/L or ×10³/µL)" }), { target: { value: "150" } });
  expect(screen.queryByText(/Score: /)).toBeNull();

  // AST 20 -> ((20/40)/150)*100 = 0.33
  fireEvent.change(screen.getByRole("spinbutton", { name: "AST (Aspartate Aminotransferase) (U/L)" }), { target: { value: "20" } });
  expect(screen.getByText("Score: 0.33")).toBeTruthy();
  expect(screen.getByText("Laboratory index")).toBeTruthy();

  // AST 70 -> ((70/40)/150)*100 = 1.17
  fireEvent.change(screen.getByRole("spinbutton", { name: "AST (Aspartate Aminotransferase) (U/L)" }), { target: { value: "70" } });
  expect(screen.getByText("Score: 1.17")).toBeTruthy();

  // AST 120 -> ((120/40)/150)*100 = 2.00; this does not establish cirrhosis.
  fireEvent.change(screen.getByRole("spinbutton", { name: "AST (Aspartate Aminotransferase) (U/L)" }), { target: { value: "120" } });
  expect(screen.getByText("Score: 2.00")).toBeTruthy();
  expect(screen.queryByText(/High probability of cirrhosis/)).toBeNull();

  // Test input rejection out of bounds
  fireEvent.change(screen.getByRole("spinbutton", { name: "AST (Aspartate Aminotransferase) (U/L)" }), { target: { value: "2" } });
  expect(screen.queryByText("Score: 2.00")).toBeNull();
  expect(screen.getByText(/Please enter valid AST/)).toBeTruthy();

  // Restore and check prompt insertion
  fireEvent.change(screen.getByRole("spinbutton", { name: "AST (Aspartate Aminotransferase) (U/L)" }), { target: { value: "120" } });
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this APRI score" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const promptCall = onInsertPrompt.mock.calls[0][0];
  expect(promptCall).toContain("value of 2.00");
  expect(promptCall).toContain("APRI");
  expect(promptCall).toContain("without diagnosing an individual");
});

it("requires complete Child-Pugh assessments and reports classes without personal mortality", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);
  fireEvent.click(screen.getByRole("tab", { name: "Child-Pugh (Cirrhosis)" }));
  expect(screen.getByText(/Child-Pugh \(Child-Turcotte-Pugh \/ CTP\) classifies cirrhosis/)).toBeTruthy();
  expect(screen.queryByText(/Score: \d+ points/)).toBeNull();
  expect(screen.queryByText(/1-year survival|perioperative abdominal mortality/)).toBeNull();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Total Bilirubin (mg/dL)" }), { target: { value: "1.5" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Serum Albumin (g/dL)" }), { target: { value: "3.8" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "INR (Prothrombin Time / INR)" }), { target: { value: "1.1" } });
  expect(screen.queryByText(/Score: \d+ points/)).toBeNull();
  fireEvent.change(screen.getByRole("combobox", { name: "Ascites" }), { target: { value: "none" } });
  expect(screen.queryByText(/Score: \d+ points/)).toBeNull();
  fireEvent.change(screen.getByRole("combobox", { name: "Hepatic Encephalopathy" }), { target: { value: "none" } });
  expect(screen.getByText("Score: 5 points")).toBeTruthy();
  expect(screen.getByText("Class A (5–6 points)")).toBeTruthy();

  // Change to Class B (7-9 points):
  // Bili 2.5 (+2 pts), Alb 3.0 (+2 pts), INR 1.9 (+2 pts), Ascites mild (+2 pts), Enceph none (+1 pt) -> 9 points -> Class B
  fireEvent.change(screen.getByRole("spinbutton", { name: "Total Bilirubin (mg/dL)" }), { target: { value: "2.5" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Serum Albumin (g/dL)" }), { target: { value: "3.0" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "INR (Prothrombin Time / INR)" }), { target: { value: "1.9" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Ascites" }), { target: { value: "mild" } });
  expect(screen.getByText("Score: 9 points")).toBeTruthy();
  expect(screen.getByText("Class B (7–9 points)")).toBeTruthy();

  // Change to Class C (10-15 points):
  // Bili 4.0 (+3 pts), Alb 2.5 (+3 pts), INR 2.5 (+3 pts), Ascites moderate (+3 pts), Enceph grade3_4 (+3 pts) -> 15 points -> Class C
  fireEvent.change(screen.getByRole("spinbutton", { name: "Total Bilirubin (mg/dL)" }), { target: { value: "4.0" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Serum Albumin (g/dL)" }), { target: { value: "2.5" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "INR (Prothrombin Time / INR)" }), { target: { value: "2.5" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Ascites" }), { target: { value: "moderate" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Hepatic Encephalopathy" }), { target: { value: "grade3_4" } });
  expect(screen.getByText("Score: 15 points")).toBeTruthy();
  expect(screen.getByText("Class C (10–15 points)")).toBeTruthy();

  // Input out of bounds validation
  fireEvent.change(screen.getByRole("spinbutton", { name: "Total Bilirubin (mg/dL)" }), { target: { value: "0" } });
  expect(screen.queryByText("Score: 15 points")).toBeNull();
  expect(screen.getByText(/Enter valid Bilirubin/)).toBeTruthy();

  // Restore and check prompt insertion
  fireEvent.change(screen.getByRole("spinbutton", { name: "Total Bilirubin (mg/dL)" }), { target: { value: "4.0" } });
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this Child-Pugh score" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const promptCall = onInsertPrompt.mock.calls[0][0];
  expect(promptCall).toContain("Child-Pugh score of 15 points");
  expect(promptCall).toContain("Class C");
  expect(promptCall).toContain("Do not infer personal survival or surgical mortality");
});

it("labels historical MELD-Na accurately and requires complete inputs", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);

  fireEvent.click(screen.getByRole("tab", { name: "MELD-Na (Liver Disease)" }));
  expect(screen.getByRole("heading", { name: "Health calculators" })).toBeTruthy();
  expect(screen.getByText(/OPTN adopted MELD 3.0 for allocation in 2023/)).toBeTruthy();
  expect(screen.queryByText(/90-day mortality/)).toBeNull();
  expect(screen.queryByText(/Score: /)).toBeNull();
  const dialysisSelect = screen.getByLabelText(/Two or more dialysis treatments/);
  expect(dialysisSelect.value).toBe("unknown");

  fireEvent.change(screen.getByRole("spinbutton", { name: "Total Bilirubin (mg/dL)" }), { target: { value: "1.5" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Serum Creatinine (mg/dL)" }), { target: { value: "1.2" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "INR (Prothrombin Time / INR)" }), { target: { value: "1.3" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Serum Sodium (mEq/L)" }), { target: { value: "135" } });
  expect(screen.queryByText("Score: 15 points")).toBeNull();
  fireEvent.change(dialysisSelect, { target: { value: "no" } });
  expect(screen.getByText("Score: 15 points")).toBeTruthy();
  expect(screen.getByText("10–19 point band")).toBeTruthy();

  // Severe decompensation: Bili 4.0, Cr 3.5, INR 2.8, Na 128 -> 36 points, Very high risk
  fireEvent.change(screen.getByRole("spinbutton", { name: "Total Bilirubin (mg/dL)" }), { target: { value: "4.0" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Serum Creatinine (mg/dL)" }), { target: { value: "3.5" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "INR (Prothrombin Time / INR)" }), { target: { value: "2.8" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Serum Sodium (mEq/L)" }), { target: { value: "128" } });
  expect(screen.getByText("Score: 36 points")).toBeTruthy();
  expect(screen.getByText("30–39 point band")).toBeTruthy();

  // The historical dialysis rule substitutes creatinine 4.0.
  fireEvent.change(dialysisSelect, { target: { value: "yes" } });
  expect(screen.getByRole("spinbutton", { name: "Serum Creatinine (mg/dL)" }).disabled).toBe(true);
  expect(screen.getByText("Score: 37 points")).toBeTruthy();

  // Input out-of-bounds validation
  fireEvent.change(screen.getByRole("spinbutton", { name: "Serum Sodium (mEq/L)" }), { target: { value: "80" } });
  expect(screen.queryByText("Score: 37 points")).toBeNull();
  expect(screen.getByText(/Enter bilirubin/)).toBeTruthy();

  // Restore and test prompt insertion
  fireEvent.change(screen.getByRole("spinbutton", { name: "Serum Sodium (mEq/L)" }), { target: { value: "128" } });
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this MELD-Na score" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const meldPrompt = onInsertPrompt.mock.calls[0][0];
  expect(meldPrompt).toContain("historical 2016 MELD-Na equation");
  expect(meldPrompt).toContain("37 points");
  expect(meldPrompt).toContain("Do not predict individual mortality");
});

it("calculates Modified Centor / McIsaac score for pharyngitis across age groups and clinical criteria", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);

  fireEvent.click(screen.getByRole("tab", { name: "Centor (Strep Throat)" }));
  expect(screen.getByRole("heading", { name: "Health calculators" })).toBeTruthy();
  expect(screen.getByText(/Modified Centor \(McIsaac\) criteria/)).toBeTruthy();

  expect(screen.getByText("0 of 5 inputs assessed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ask MedAssist about this Centor score" }).disabled).toBe(true);

  const tonsilsSelect = screen.getByLabelText(/Tonsillar exudate or swelling/i);
  const nodesSelect = screen.getByLabelText(/Tender or swollen anterior cervical lymph nodes/i);
  const feverSelect = screen.getByLabelText(/History of fever/i);
  const noCoughSelect = screen.getByLabelText(/Absence of cough/i);
  const ageSelect = screen.getByLabelText(/Age group \(McIsaac criteria\)/i);

  for (const select of [tonsilsSelect, nodesSelect, feverSelect, noCoughSelect]) {
    fireEvent.change(select, { target: { value: "present" } });
  }
  expect(screen.getByText("4 of 5 inputs assessed")).toBeTruthy();
  fireEvent.change(ageSelect, { target: { value: "15to44" } });

  expect(screen.getByText("Score: 4 points")).toBeTruthy();
  expect(screen.getByText("4 to 5 point band")).toBeTruthy();

  fireEvent.change(ageSelect, { target: { value: "3to14" } });
  expect(screen.getByText("Score: 5 points")).toBeTruthy();

  fireEvent.change(ageSelect, { target: { value: "45plus" } });
  expect(screen.getByText("Score: 3 points")).toBeTruthy();
  expect(screen.getByText("3 point band")).toBeTruthy();

  fireEvent.change(feverSelect, { target: { value: "absent" } });
  fireEvent.change(tonsilsSelect, { target: { value: "absent" } });
  expect(screen.getByText("Score: 1 point")).toBeTruthy();
  expect(screen.getByText("−1 to 1 point band")).toBeTruthy();

  // Prompt insertion test
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this Centor score" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const centorPrompt = onInsertPrompt.mock.calls[0][0];
  expect(centorPrompt).toContain("Modified Centor / McIsaac score of 1 point");
});

it("calculates HEART score for chest pain MACE stratification across all 5 clinical categories", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);

  fireEvent.click(screen.getByRole("tab", { name: "HEART (Chest Pain)" }));
  expect(screen.getByRole("heading", { name: "Health calculators" })).toBeTruthy();
  expect(screen.getByText(/HEART Score is an evidence-based clinical decision rule/)).toBeTruthy();

  expect(screen.getByText("0 of 5 inputs assessed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ask MedAssist about this HEART score" }).disabled).toBe(true);
  expect(screen.getByText(/cannot determine whether discharge/)).toBeTruthy();

  fireEvent.change(screen.getByLabelText(/History \(anamnesis suspicion\)/i), { target: { value: "slightly" } });
  fireEvent.change(screen.getByLabelText(/ECG \(electrocardiogram\)/i), { target: { value: "normal" } });
  fireEvent.change(screen.getByLabelText(/^Age$/i), { target: { value: "under45" } });
  fireEvent.change(screen.getByLabelText(/Risk factors/i), { target: { value: "none" } });
  fireEvent.change(screen.getByLabelText(/Initial Troponin/i), { target: { value: "normal" } });
  expect(screen.getByText("Score: 0 points")).toBeTruthy();
  expect(screen.getByText("0–3 point band")).toBeTruthy();

  // Elevate to high risk: highly (+2), st_deviation (+2), 65plus (+2), three_plus (+2), greater_three (+2) -> 10 points
  fireEvent.change(screen.getByLabelText(/History \(anamnesis suspicion\)/i), { target: { value: "highly" } });
  fireEvent.change(screen.getByLabelText(/ECG \(electrocardiogram\)/i), { target: { value: "st_deviation" } });
  fireEvent.change(screen.getByLabelText(/^Age$/i), { target: { value: "65plus" } });
  fireEvent.change(screen.getByLabelText(/Risk factors/i), { target: { value: "three_plus" } });
  fireEvent.change(screen.getByLabelText(/Initial Troponin/i), { target: { value: "greater_three" } });

  expect(screen.getByText("Score: 10 points")).toBeTruthy();
  expect(screen.getByText("7–10 point band")).toBeTruthy();

  // Intermediate risk check: moderate (1), nonspecific (1), 45to64 (1), one_two (1), one_to_three (1) -> 5 points
  fireEvent.change(screen.getByLabelText(/History \(anamnesis suspicion\)/i), { target: { value: "moderate" } });
  fireEvent.change(screen.getByLabelText(/ECG \(electrocardiogram\)/i), { target: { value: "nonspecific" } });
  fireEvent.change(screen.getByLabelText(/^Age$/i), { target: { value: "45to64" } });
  fireEvent.change(screen.getByLabelText(/Risk factors/i), { target: { value: "one_two" } });
  fireEvent.change(screen.getByLabelText(/Initial Troponin/i), { target: { value: "one_to_three" } });

  expect(screen.getByText("Score: 5 points")).toBeTruthy();
  expect(screen.getByText("4–6 point band")).toBeTruthy();

  // Prompt insertion test
  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this HEART score" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const heartPrompt = onInsertPrompt.mock.calls[0][0];
  expect(heartPrompt).toContain("HEART Score of 5 points");
});

it("keeps unassessed PERC criteria distinct from absent criteria and avoids rule-out advice", () => {
  const onInsertPrompt = vi.fn();
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={onInsertPrompt} />);

  fireEvent.click(screen.getByRole("tab", { name: "PERC (PE Rule-Out)" }));
  expect(screen.getByRole("heading", { name: "Health calculators" })).toBeTruthy();
  expect(screen.getByText(/PERC is a clinical decision rule/)).toBeTruthy();
  expect(screen.getByText("0 of 8 criteria assessed")).toBeTruthy();
  expect(screen.getByText("Assessment incomplete")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ask MedAssist about this PERC rule" }).disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Copy result" }).disabled).toBe(true);

  const selects = [...screen.getByRole("tabpanel", { name: "PERC (PE Rule-Out)" }).querySelectorAll("select")];
  expect(selects).toHaveLength(8);
  fireEvent.change(selects[0], { target: { value: "present" } });
  expect(screen.getByText("1 of 8 criteria assessed")).toBeTruthy();
  expect(screen.getByText("Assessment incomplete")).toBeTruthy();

  for (const select of selects.slice(1)) fireEvent.change(select, { target: { value: "absent" } });
  expect(screen.getByText("1 of 8 criteria present")).toBeTruthy();
  expect(screen.getByText("All criteria recorded")).toBeTruthy();
  expect(screen.getByText(/not a diagnosis or a rule-out decision/)).toBeTruthy();
  expect(screen.queryByText(/PE ruled out|Neither D-dimer/i)).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Ask MedAssist about this PERC rule" }));
  expect(onInsertPrompt).toHaveBeenCalled();
  const percPrompt = onInsertPrompt.mock.calls[0][0];
  expect(percPrompt).toContain("1 of 8 criteria present");
  expect(percPrompt).toContain("Do not give an individual rule-out");
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

  // Wrapping from last tab (PERC) to first (BMI) and back
  const percTab = screen.getByRole("tab", { name: "PERC (PE Rule-Out)" });
  percTab.focus();
  fireEvent.keyDown(percTab, { key: "ArrowRight" });
  expect(bmiTab.getAttribute("aria-selected")).toBe("true");
  fireEvent.keyDown(bmiTab, { key: "ArrowLeft" });
  expect(percTab.getAttribute("aria-selected")).toBe("true");
});

it("lets users jump directly to a calculator beyond the visible tab strip", () => {
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Jump to calculator"), { target: { value: "perc" } });
  expect(screen.getByRole("tab", { name: "PERC (PE Rule-Out)" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("tabpanel", { name: "PERC (PE Rule-Out)" })).toBeTruthy();
});
