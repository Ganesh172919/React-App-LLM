const test = require("node:test");
const assert = require("node:assert/strict");
const { detectDrugInteractions } = require("../services/interactionService");

test("detects critical anticoagulant and NSAID interaction", () => {
  const result = detectDrugInteractions("Can I take warfarin with ibuprofen for my knee pain?");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "Anticoagulant / Antiplatelet + NSAIDs / Aspirin");
  assert.equal(result[0].severity, "CRITICAL");
  assert.match(result[0].description, /gastrointestinal/i);
  assert.match(result[0].clinicalRecommendation, /Do not change prescribed medicines based on this app/);
});

test("detects brand names for anticoagulant and aspirin interaction", () => {
  const result = detectDrugInteractions("Is it safe to take Eliquis and Advil together?");
  assert.equal(result.length, 1);
  assert.equal(result[0].severity, "CRITICAL");
});

test("detects sildenafil and nitroglycerin absolute contraindication", () => {
  const result = detectDrugInteractions("Patient takes nitroglycerin sublingual and is asking about Viagra.");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "PDE5 Inhibitor + Nitrate Vasodilator");
  assert.equal(result[0].severity, "CRITICAL");
});

test("detects serotonergic interaction between tramadol and sertraline", () => {
  const result = detectDrugInteractions("Can I use tramadol if I am currently prescribed Zoloft?");
  assert.equal(result.length, 1);
  assert.match(result[0].pair, /serotonergic/i);
  assert.equal(result[0].severity, "HIGH");
});

test("detects ACE inhibitor and spironolactone hyperkalemia risk", () => {
  const result = detectDrugInteractions("Starting lisinopril 20mg alongside spironolactone 25mg daily.");
  assert.equal(result.length, 1);
  assert.match(result[0].description, /hyperkalemia/i);
});

test("detects methotrexate and bactrim bone marrow suppression risk", () => {
  const result = detectDrugInteractions("Prescribing Bactrim for a UTI in a patient taking methotrexate for rheumatoid arthritis.");
  assert.equal(result.length, 1);
  assert.equal(result[0].severity, "CRITICAL");
});

test("detects fluoroquinolone and steroid tendon rupture risk", () => {
  const result = detectDrugInteractions("Co-prescribing ciprofloxacin and prednisone for severe infection with inflammation.");
  assert.equal(result.length, 1);
  assert.match(result[0].description, /tendon/i);
});

test("detects opioid and benzodiazepine respiratory depression risk", () => {
  const result = detectDrugInteractions("Taking oxycodone and xanax together at night.");
  assert.equal(result.length, 1);
  assert.equal(result[0].severity, "CRITICAL");
});

test("detects statin and clarithromycin rhabdomyolysis risk", () => {
  const result = detectDrugInteractions("Can I take simvastatin while taking clarithromycin for bronchitis?");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "Statin + Strong CYP3A4 Inhibitor / Fibrate");
  assert.equal(result[0].severity, "CRITICAL");
  assert.match(result[0].description, /rhabdomyolysis/i);
});

test("detects warfarin and fluconazole CYP2C9 bleeding risk", () => {
  const result = detectDrugInteractions("Patient on Coumadin needs Diflucan for fungal infection.");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "Warfarin + Azole Antifungal");
  assert.equal(result[0].severity, "CRITICAL");
  assert.match(result[0].description, /bleeding/i);
});

test("detects digoxin and amiodarone toxicity risk", () => {
  const result = detectDrugInteractions("Starting amiodarone in a heart failure patient on Lanoxin.");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "Digoxin + Amiodarone / Verapamil");
  assert.equal(result[0].severity, "HIGH");
  assert.match(result[0].description, /digoxin/i);
});

test("detects MAO inhibitor and SSRI hypertensive / serotonergic crisis", () => {
  const result = detectDrugInteractions("Patient taking Nardil was prescribed Zoloft.");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "MAO Inhibitor + SSRI / SNRI / Sympathomimetic");
  assert.equal(result[0].severity, "CRITICAL");
});

test("detects allopurinol and azathioprine bone marrow toxicity contraindication", () => {
  const result = detectDrugInteractions("Can a patient on Imuran take allopurinol for acute gout?");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "Allopurinol / Febuxostat + Azathioprine / 6-Mercaptopurine");
  assert.equal(result[0].severity, "CRITICAL");
  assert.match(result[0].description, /bone marrow suppression/i);
});

test("detects methotrexate and NSAID critical interaction", () => {
  const result = detectDrugInteractions("Can I take methotrexate with ibuprofen for joint swelling?");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "Methotrexate + NSAIDs / High-Dose Aspirin");
  assert.equal(result[0].severity, "CRITICAL");
  assert.match(result[0].description, /bone marrow suppression/i);
  assert.match(result[0].description, /FDA Black Box Warning/i);
});

test("detects warfarin and bactrim critical interaction", () => {
  const result = detectDrugInteractions("Patient on Coumadin needs Bactrim for a urinary tract infection.");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "Warfarin + Trimethoprim-Sulfamethoxazole");
  assert.equal(result[0].severity, "CRITICAL");
  assert.match(result[0].description, /CYP2C9/i);
  assert.match(result[0].description, /INR surges/i);
});

test("detects clopidogrel and omeprazole / esomeprazole contraindication", () => {
  const result = detectDrugInteractions("Can I take Plavix with omeprazole to protect my stomach?");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "Clopidogrel + Omeprazole / Esomeprazole");
  assert.equal(result[0].severity, "CRITICAL");
  assert.match(result[0].description, /CYP2C19/i);
  assert.match(result[0].description, /stent thrombosis/i);

  const nexiumResult = detectDrugInteractions("Starting clopidogrel and Nexium together.");
  assert.equal(nexiumResult.length, 1);
  assert.equal(nexiumResult[0].pair, "Clopidogrel + Omeprazole / Esomeprazole");
});

test("detects SSRI / SNRI and triptan serotonergic toxicity risk", () => {
  const result = detectDrugInteractions("Can I take sumatriptan for a migraine while I am on sertraline?");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "SSRI / SNRI / MAOI + Triptan (Serotonergic Toxicity)");
  assert.equal(result[0].severity, "CRITICAL");
  assert.match(result[0].description, /Serotonin Syndrome/i);

  const brandResult = detectDrugInteractions("Patient taking Zoloft needs Imitrex for acute migraine attacks.");
  assert.equal(brandResult.length, 1);
  assert.equal(brandResult[0].pair, "SSRI / SNRI / MAOI + Triptan (Serotonergic Toxicity)");
});

test("detects bactrim and ACE inhibitor / ARB hyperkalemia risk", () => {
  const result = detectDrugInteractions("Prescribing Bactrim for cellulitis in an elderly patient taking lisinopril.");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "Trimethoprim-Sulfamethoxazole + ACE Inhibitor / ARB / K-Sparing Diuretic");
  assert.equal(result[0].severity, "CRITICAL");
  assert.match(result[0].description, /hyperkalemia/i);
  assert.match(result[0].description, /distal nephron epithelial sodium channels/i);

  const arbResult = detectDrugInteractions("Patient on losartan is prescribed Septra.");
  assert.equal(arbResult.length, 1);
  assert.equal(arbResult[0].pair, "Trimethoprim-Sulfamethoxazole + ACE Inhibitor / ARB / K-Sparing Diuretic");
});

test("detects theophylline and ciprofloxacin CYP1A2 toxicity contraindication", () => {
  const result = detectDrugInteractions("Can a COPD patient on theophylline take ciprofloxacin for a bacterial exacerbation?");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "Theophylline + Fluoroquinolone (CYP1A2 Inhibition)");
  assert.equal(result[0].severity, "CRITICAL");
  assert.match(result[0].description, /CYP1A2/i);
  assert.match(result[0].description, /seizures/i);

  const brandResult = detectDrugInteractions("Prescribed Cipro while taking Theo-24 daily.");
  assert.equal(brandResult.length, 1);
  assert.equal(brandResult[0].pair, "Theophylline + Fluoroquinolone (CYP1A2 Inhibition)");
});

test("detects colchicine and clarithromycin / P-gp inhibition toxicity contraindication", () => {
  const result = detectDrugInteractions("Can I take colchicine for a gout flare while on clarithromycin for pneumonia?");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "Colchicine + Strong CYP3A4 / P-gp Inhibitor");
  assert.equal(result[0].severity, "CRITICAL");
  assert.match(result[0].description, /P-glycoprotein/i);
  assert.match(result[0].description, /rhabdomyolysis/i);

  const brandResult = detectDrugInteractions("Patient taking Colcrys was prescribed Biaxin.");
  assert.equal(brandResult.length, 1);
  assert.equal(brandResult[0].pair, "Colchicine + Strong CYP3A4 / P-gp Inhibitor");
});

test("detects carbamazepine and strong CYP3A4 inhibitor neurotoxicity contraindication", () => {
  const result = detectDrugInteractions("Can an epileptic patient on carbamazepine take erythromycin for bronchitis?");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "Carbamazepine + Strong CYP3A4 Inhibitor");
  assert.equal(result[0].severity, "CRITICAL");
  assert.match(result[0].description, /CYP3A4/i);
  assert.match(result[0].description, /ataxia/i);

  const brandResult = detectDrugInteractions("Patient on Tegretol prescribed Diflucan for fungal infection.");
  assert.equal(brandResult.length, 1);
  assert.equal(brandResult[0].pair, "Carbamazepine + Strong CYP3A4 Inhibitor");
});

test("detects linezolid and SSRI / SNRI serotonin syndrome contraindication", () => {
  const result = detectDrugInteractions("Can a patient taking linezolid take sertraline for depression?");
  assert.equal(result.length, 1);
  assert.equal(result[0].pair, "Linezolid + SSRI / SNRI (Serotonin Syndrome)");
  assert.equal(result[0].severity, "CRITICAL");
  assert.match(result[0].description, /monoamine oxidase inhibitor/i);
  assert.match(result[0].description, /Serotonin Syndrome/i);

  const brandResult = detectDrugInteractions("Can a patient on Lexapro be prescribed Zyvox for an infection?");
  assert.equal(brandResult.length, 1);
  assert.equal(brandResult[0].pair, "Linezolid + SSRI / SNRI (Serotonin Syndrome)");
});

test("detects Warfarin + Amiodarone (CYP2C9 & CYP3A4 Inhibition) critical interaction", () => {
  const genericResult = detectDrugInteractions("The patient is on warfarin for a mechanical heart valve and amiodarone for ventricular tachycardia.");
  assert.equal(genericResult.length, 1);
  assert.equal(genericResult[0].pair, "Warfarin + Amiodarone (CYP2C9 & CYP3A4 Inhibition)");
  assert.equal(genericResult[0].severity, "CRITICAL");
  assert.match(genericResult[0].description, /CYP2C9 and CYP3A4/);

  const brandResult = detectDrugInteractions("Can a patient taking Coumadin also receive Cordarone for atrial fibrillation rhythm control?");
  assert.equal(brandResult.length, 1);
  assert.equal(brandResult[0].pair, "Warfarin + Amiodarone (CYP2C9 & CYP3A4 Inhibition)");
});

test("returns empty array when only one drug or safe combination is mentioned", () => {
  assert.deepEqual(detectDrugInteractions("Can I take warfarin with acetaminophen?"), []);
  assert.deepEqual(detectDrugInteractions("What is the dose for amoxicillin?"), []);
  assert.deepEqual(detectDrugInteractions("How does insulin work in type 1 diabetes?"), []);
  assert.deepEqual(detectDrugInteractions(""), []);
  assert.deepEqual(detectDrugInteractions(null), []);
});
