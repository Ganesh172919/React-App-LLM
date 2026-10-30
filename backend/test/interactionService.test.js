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

test("returns empty array when only one drug or safe combination is mentioned", () => {
  assert.deepEqual(detectDrugInteractions("Can I take warfarin with acetaminophen?"), []);
  assert.deepEqual(detectDrugInteractions("What is the dose for amoxicillin?"), []);
  assert.deepEqual(detectDrugInteractions("How does insulin work in type 1 diabetes?"), []);
  assert.deepEqual(detectDrugInteractions(""), []);
  assert.deepEqual(detectDrugInteractions(null), []);
});
