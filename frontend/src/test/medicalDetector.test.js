import { describe, expect, it } from "vitest";
import { isMedicalQuery } from "../utils/medicalDetector";

describe("medicalDetector - isMedicalQuery", () => {
  it("detects short 2-3 word clinical topics from suggestion chips", () => {
    expect(isMedicalQuery("Migraine triggers")).toBe(true);
    expect(isMedicalQuery("Asthma symptoms")).toBe(true);
    expect(isMedicalQuery("High blood pressure")).toBe(true);
    expect(isMedicalQuery("Kidney disease")).toBe(true);
    expect(isMedicalQuery("Antibiotic dosage")).toBe(true);
    expect(isMedicalQuery("Chest pain")).toBe(true);
  });

  it("detects full medical questions with interrogative syntax", () => {
    expect(isMedicalQuery("What are common migraine triggers?")).toBe(true);
    expect(isMedicalQuery("How is asthma diagnosed in adults?")).toBe(true);
    expect(isMedicalQuery("Can I take warfarin with ibuprofen?")).toBe(true);
    expect(isMedicalQuery("What causes sudden dizziness and nausea?")).toBe(true);
    expect(isMedicalQuery("Is insulin safe during pregnancy?")).toBe(true);
    expect(isMedicalQuery("Why should I see a doctor for high blood pressure?")).toBe(true);
  });

  it("detects pharmacological and drug interaction inquiries", () => {
    expect(isMedicalQuery("Simvastatin and clarithromycin interaction")).toBe(true);
    expect(isMedicalQuery("Side effects of lisinopril")).toBe(true);
    expect(isMedicalQuery("Amoxicillin 500mg dosage")).toBe(true);
    expect(isMedicalQuery("Paracetamol and alcohol")).toBe(true);
  });

  it("correctly rejects non-medical inquiries and avoids false positives", () => {
    expect(isMedicalQuery("What is the capital of France?")).toBe(false);
    expect(isMedicalQuery("Write a python script to sort an array")).toBe(false);
    expect(isMedicalQuery("How to change a tire on a bicycle")).toBe(false);
    expect(isMedicalQuery("Tire pressure for winter driving")).toBe(false);
    expect(isMedicalQuery("Unit test for authentication in Jest")).toBe(false);
    expect(isMedicalQuery("Economic growth and market performance in 2026")).toBe(false);
    expect(isMedicalQuery("What time is the next train?")).toBe(false);
  });

  it("handles empty, malformed, or boundary inputs gracefully", () => {
    expect(isMedicalQuery("")).toBe(false);
    expect(isMedicalQuery("   ")).toBe(false);
    expect(isMedicalQuery(null)).toBe(false);
    expect(isMedicalQuery(undefined)).toBe(false);
    expect(isMedicalQuery(12345)).toBe(false);
    expect(isMedicalQuery("a")).toBe(false);
  });
});
