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

it("supports arrow key navigation across calculator tabs", () => {
  render(<ClinicalCalculatorsModal isOpen onClose={vi.fn()} onInsertPrompt={vi.fn()} />);
  const bmiTab = screen.getByRole("tab", { name: "BMI" });
  bmiTab.focus();
  fireEvent.keyDown(bmiTab, { key: "ArrowRight" });
  const egfrTab = screen.getByRole("tab", { name: "eGFR (CKD-EPI)" });
  expect(egfrTab.getAttribute("aria-selected")).toBe("true");
  fireEvent.keyDown(egfrTab, { key: "ArrowLeft" });
  expect(bmiTab.getAttribute("aria-selected")).toBe("true");

  // Wrapping from last tab (CURB-65) to first (BMI) and back
  const curbTab = screen.getByRole("tab", { name: "CURB-65 (Pneumonia)" });
  curbTab.focus();
  fireEvent.keyDown(curbTab, { key: "ArrowRight" });
  expect(bmiTab.getAttribute("aria-selected")).toBe("true");
  fireEvent.keyDown(bmiTab, { key: "ArrowLeft" });
  expect(curbTab.getAttribute("aria-selected")).toBe("true");
});
