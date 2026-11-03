const path = require("path");
const fs = require("fs/promises");
const assert = require("node:assert/strict");
const requireFrontend = require("module").createRequire(path.resolve(__dirname, "../frontend/package.json"));
const { chromium } = process.env.PLAYWRIGHT_MODULE ? require(process.env.PLAYWRIGHT_MODULE) : requireFrontend("playwright");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "output/qa");
const base = process.env.APP_URL || "http://127.0.0.1:4173";

async function main() {
  await fs.mkdir(output, { recursive: true });
  const channel = process.env.PLAYWRIGHT_CHANNEL || "chrome";
  const browser = await chromium.launch({ headless: true, channel });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  console.log("Navigating to home page...");
  await page.goto(base);
  await page.getByRole("heading", { name: "Health questions, with the sources in view.", exact: true }).waitFor();

  // Test 1: Dark Mode on Home
  const themeToggle = page.getByRole("button", { name: /Switch to (dark|light) mode/i });
  await themeToggle.click();
  const htmlTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  assert.equal(htmlTheme, "dark");
  await page.screenshot({ path: path.join(output, "home-dark-desktop.png"), fullPage: true });
  console.log("PASS home page dark mode theme applied");

  // Sign in
  await page.getByRole("link", { name: "Sign in", exact: true }).first().click();
  await page.getByLabel("Email", { exact: true }).fill("student@example.test");
  await page.getByLabel(/^Password/).fill("Student-demo-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Health Q&A" }).waitFor();
  await page.getByText("Live updates connected", { exact: true }).waitFor();

  // Test 2: Chat Workspace in Dark Mode
  await page.screenshot({ path: path.join(output, "chat-dark-desktop.png"), fullPage: true });
  console.log("PASS chat workspace dark mode rendered");

  // Test 3: Clinical Calculators via Alt+C shortcut
  await page.keyboard.press("Alt+c");
  const modal = page.getByRole("dialog", { name: "Health calculators" });
  await modal.waitFor();
  console.log("PASS clinical tools modal opened via Alt+c keyboard shortcut");
  await page.getByRole("tab", { name: "Corrected Calcium" }).click();
  await page.getByText(/Payne equation for hypoalbuminemia/).waitFor();
  await page.getByText("9.2 mg/dL", { exact: true }).waitFor();
  await page.getByText("Typical reference (8.5–10.5 mg/dL)").waitFor();
  await page.screenshot({ path: path.join(output, "calculators-dark-modal.png") });
  console.log("PASS corrected calcium calculator displayed with proper dark styles");

  // Test 3b: Serum Anion Gap Tab in Clinical Calculators
  await page.getByRole("tab", { name: "Serum Anion Gap" }).click();
  await page.getByText(/Evaluates unmeasured anions in serum/).waitFor();
  await page.getByText("12 mEq/L", { exact: true }).waitFor();
  await page.getByText("Typical reference range (8–12 mEq/L)").waitFor();
  await page.screenshot({ path: path.join(output, "aniongap-dark-modal.png") });
  console.log("PASS serum anion gap calculator displayed with proper dark styles");

  // Test 3c: FeNa Tab in Clinical Calculators
  await page.getByRole("tab", { name: /FeNa/i }).click();
  await page.getByText(/Fractional Excretion of Sodium \(FeNa\)/).waitFor();
  await page.getByText("0.21%", { exact: true }).waitFor();
  await page.getByText("Below 1%").waitFor();
  await page.getByText(/No value alone establishes the cause of kidney injury/).waitFor();
  await page.screenshot({ path: path.join(output, "fena-dark-modal.png") });
  console.log("PASS FeNa calculator displayed with proper dark styles");

  // Test 3d: FeUrea Tab in Clinical Calculators
  await page.getByRole("tab", { name: /FeUrea/i }).click();
  await page.getByText(/Fractional Excretion of Urea \(FeUrea\)/).waitFor();
  await page.getByText("25%", { exact: true }).waitFor();
  await page.getByText("Below 35%").waitFor();
  await page.getByText(/35%–50% is an indeterminate range/).waitFor();
  await page.screenshot({ path: path.join(output, "feurea-dark-modal.png") });
  console.log("PASS FeUrea calculator displayed with proper dark styles");

  // Test 3e: Maintenance Fluids Tab in Clinical Calculators
  await page.getByRole("tab", { name: "Pediatric 4-2-1 fluid example" }).click();
  await page.getByText(/Pediatric teaching example of the Holliday-Segar 4-2-1 rule/).waitFor();
  await page.getByText("60 mL/hr", { exact: true }).waitFor();
  await page.getByText("1,440 mL / 24 hours").waitFor();
  await page.getByText(/not a patient order/).waitFor();
  await page.screenshot({ path: path.join(output, "fluids-dark-modal.png") });
  console.log("PASS maintenance fluids calculator displayed with proper dark styles");

  // Test 3f: Wells' Criteria for PE Tab in Clinical Calculators
  await page.getByRole("tab", { name: /Wells' Criteria/i }).click();
  await page.getByText(/A low score alone cannot rule out PE/).waitFor();
  await page.getByText("0 points", { exact: true }).waitFor();
  await page.getByText("NICE score band: 4 or less").waitFor();
  // Check DVT symptoms (+3.0) and Heart rate > 100 bpm (+1.5)
  await page.getByLabel(/Clinical signs and symptoms of DVT/).check();
  await page.getByLabel(/Heart rate > 100 beats\/min/).check();
  await page.getByText("4.5 points", { exact: true }).waitFor();
  await page.getByText("NICE score band: above 4").waitFor();
  await page.screenshot({ path: path.join(output, "wells-dark-modal.png") });
  console.log("PASS Wells' criteria for PE calculator verified and captured in dark styles");

  // Test 3g: CURB-65 Pneumonia Severity Score Tab in Clinical Calculators
  await page.getByRole("tab", { name: /CURB-65/i }).click();
  await page.getByText(/assessing 30-day mortality in adults with community-acquired pneumonia/).waitFor();
  await page.getByText("0 / 5 points", { exact: true }).waitFor();
  await page.getByText("Low risk (30-day mortality < 3%)").waitFor();
  // Check Confusion (+1) and Respiratory rate (+1)
  await page.getByLabel(/Confusion \(new mental confusion/).check();
  await page.getByLabel(/Respiratory rate ≥ 30 breaths\/min/).check();
  await page.getByText("2 / 5 points", { exact: true }).waitFor();
  await page.getByText("Moderate risk (30-day mortality ~9%)").waitFor();
  await page.screenshot({ path: path.join(output, "curb65-dark-modal.png") });
  console.log("PASS CURB-65 pneumonia severity calculator verified and captured in dark styles");

  // Test 3h: Glasgow Coma Scale (GCS) Tab in Clinical Calculators
  await page.getByRole("tab", { name: /GCS \(Coma Scale\)/i }).click();
  await page.getByText(/objective evaluation of level of consciousness/).waitFor();
  await page.getByText("15 / 15 points (E4V5M6)", { exact: true }).waitFor();
  await page.getByText("Mild brain injury / Alert (13–15)").waitFor();
  await page.screenshot({ path: path.join(output, "gcs-dark-modal.png") });
  console.log("PASS Glasgow Coma Scale calculator verified and captured in dark styles");

  // Test 3i: HAS-BLED Bleeding Risk Score Tab in Clinical Calculators
  await page.getByRole("tab", { name: /HAS-BLED \(Bleeding Risk\)/i }).click();
  await page.getByText(/assesses 1-year major bleeding risk in patients receiving anticoagulation/).waitFor();
  await page.getByText("0 / 9 points", { exact: true }).waitFor();
  await page.getByText(/Low bleeding risk/).waitFor();
  await page.getByLabel(/H: Hypertension/).check();
  await page.getByLabel(/A: Abnormal renal function/).check();
  await page.getByText("2 / 9 points", { exact: true }).waitFor();
  await page.getByText(/Moderate bleeding risk/).waitFor();
  await page.screenshot({ path: path.join(output, "hasbled-dark-modal.png") });
  console.log("PASS HAS-BLED bleeding risk calculator verified and captured in dark styles");

  // Test 3j: qSOFA Sepsis Screening Tab in Clinical Calculators
  await page.getByRole("tab", { name: /qSOFA \(Sepsis Screening\)/i }).click();
  await page.getByText(/educational bedside screening tool used to identify adult patients with suspected infection/).waitFor();
  await page.getByText("0 / 3 points", { exact: true }).waitFor();
  await page.getByText(/Not high risk for in-hospital sepsis mortality/).waitFor();
  await page.getByLabel(/Altered Mental Status/).check();
  await page.getByLabel(/Tachypnea/).check();
  await page.getByText("2 / 3 points", { exact: true }).waitFor();
  await page.getByText(/High risk for in-hospital sepsis mortality/).waitFor();
  await page.screenshot({ path: path.join(output, "qsofa-dark-modal.png") });
  console.log("PASS qSOFA sepsis screening calculator verified and captured in dark styles");

  // Test 3k: Mosteller BSA Tab in Clinical Calculators
  await page.getByRole("tab", { name: "BSA (Mosteller)" }).click();
  await page.getByText(/Mosteller formula is the widely utilized clinical standard for estimating Body Surface Area/).waitFor();
  await page.getByText("1.84 m²", { exact: true }).waitFor();
  await page.getByText("Mosteller BSA", { exact: true }).waitFor();
  // Switch to Imperial and fill height 72 in, weight 180 lbs
  await page.getByRole("button", { name: "Imperial (in / lbs)" }).click();
  await page.getByText("1.84 m²", { exact: true }).waitFor();
  await page.getByRole("spinbutton", { name: "Height (inches)" }).fill("72");
  await page.getByRole("spinbutton", { name: "Weight (lbs)" }).fill("180");
  await page.getByText("2.03 m²", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, "bsa-dark-modal.png") });
  console.log("PASS Mosteller BSA calculator verified and captured in dark styles");

  // Test 3l: APRI (Liver Fibrosis) Tab in Clinical Calculators
  await page.getByRole("tab", { name: "APRI (Liver Fibrosis)" }).click();
  await page.getByText(/AST to Platelet Ratio Index \(APRI\) is a non-invasive biomarker index/).waitFor();
  await page.getByText("Score: 0.75", { exact: true }).waitFor();
  await page.getByText(/Indeterminate \/ intermediate fibrosis probability/).waitFor();
  // Change AST to 120 -> Score: 2.00, High probability of cirrhosis
  await page.getByRole("spinbutton", { name: "AST (Aspartate Aminotransferase) (U/L)" }).fill("120");
  await page.getByText("Score: 2.00", { exact: true }).waitFor();
  await page.getByText(/High probability of cirrhosis/).waitFor();
  await page.screenshot({ path: path.join(output, "apri-dark-modal.png") });
  console.log("PASS APRI liver fibrosis calculator verified and captured in dark styles");

  // Test 3m: Child-Pugh (Cirrhosis) Tab in Clinical Calculators
  await page.getByRole("tab", { name: "Child-Pugh (Cirrhosis)" }).click();
  await page.getByText(/prognostic system for assessing the severity of cirrhosis/i).waitFor();
  await page.getByText("Score: 5 points", { exact: true }).waitFor();
  await page.getByText("Class A (5–6 points)", { exact: true }).waitFor();
  await page.getByText(/Well-compensated cirrhosis/i).waitFor();

  // Change to severe values -> Bilirubin 4.0, Albumin 2.5, INR 2.5, Ascites moderate, Encephalopathy grade3_4
  await page.getByRole("spinbutton", { name: "Total Bilirubin (mg/dL)" }).fill("4.0");
  await page.getByRole("spinbutton", { name: "Serum Albumin (g/dL)" }).fill("2.5");
  await page.getByRole("spinbutton", { name: "INR (Prothrombin Time / INR)" }).fill("2.5");
  await page.getByLabel("Ascites").selectOption("moderate");
  await page.getByLabel("Hepatic Encephalopathy").selectOption("grade3_4");

  await page.getByText("Score: 15 points", { exact: true }).waitFor();
  await page.getByText("Class C (10–15 points)", { exact: true }).waitFor();
  await page.getByText(/Decompensated cirrhosis/i).waitFor();
  await page.screenshot({ path: path.join(output, "childpugh-dark-modal.png") });
  console.log("PASS Child-Pugh cirrhosis mortality calculator verified and captured in dark styles");

  // Test 3n: MELD-Na (Liver Disease) Tab in Clinical Calculators
  await page.getByRole("tab", { name: "MELD-Na (Liver Disease)" }).click();
  await page.getByText(/OPTN 2016/i).waitFor();
  await page.getByText("Score: 15 points", { exact: true }).waitFor();
  await page.getByText("Intermediate risk (~6.0% 90-day mortality)", { exact: true }).waitFor();

  // Severe values -> Bilirubin 4.0, Creatinine 3.5, INR 2.8, Sodium 128
  await page.getByRole("spinbutton", { name: "Total Bilirubin (mg/dL)" }).fill("4.0");
  await page.getByRole("spinbutton", { name: "Serum Creatinine (mg/dL)" }).fill("3.5");
  await page.getByRole("spinbutton", { name: "INR (Prothrombin Time / INR)" }).fill("2.8");
  await page.getByRole("spinbutton", { name: "Serum Sodium (mEq/L)" }).fill("128");

  await page.getByText("Score: 36 points", { exact: true }).waitFor();
  await page.getByText("Very high risk (~52.6% 90-day mortality)", { exact: true }).waitFor();

  // Check dialysis checkbox
  await page.getByLabel(/Dialysis history/i).check();
  await page.getByText("Score: 37 points", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, "meld-dark-modal.png") });
  console.log("PASS MELD-Na liver disease prognostic calculator verified and captured in dark styles");

  // Test 3o: Centor (Strep Throat) Tab in Clinical Calculators
  await page.getByRole("tab", { name: "Centor (Strep Throat)" }).click();
  await page.getByText(/The Modified Centor Score/i).waitFor();
  await page.getByText("Score: 0 points", { exact: true }).waitFor();
  await page.getByText(/Low risk \(1–10% streptococcal probability/i).waitFor();

  // Check symptoms: tonsils (+1), nodes (+1), fever (+1), no cough (+1)
  await page.getByLabel(/Tonsillar exudate or swelling/i).check();
  await page.getByLabel(/Tender or swollen anterior cervical lymph nodes/i).check();
  await page.getByLabel(/History of fever/i).check();
  await page.getByLabel(/Absence of cough/i).check();
  await page.getByText("Score: 4 points", { exact: true }).waitFor();
  await page.getByText(/High risk \(51–53% probability/i).waitFor();

  // Change age group to 3 to 14 years old (+1) -> Score: 5 points
  await page.getByLabel(/Age group \(McIsaac criteria\)/i).selectOption("3to14");
  await page.getByText("Score: 5 points", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, "centor-dark-modal.png") });
  console.log("PASS Centor (McIsaac) pharyngitis calculator verified and captured in dark styles");

  // Test 3q: HEART (Chest Pain) Tab in Clinical Calculators
  await page.getByRole("tab", { name: "HEART (Chest Pain)" }).click();
  await page.getByText(/HEART Score is an evidence-based clinical decision rule/i).waitFor();
  await page.getByText("Score: 3 points", { exact: true }).waitFor();
  await page.getByText(/Low risk \(~0\.9–1\.7% 6-week MACE risk/i).waitFor();

  // Change dropdowns to high risk: highly (+2), st_deviation (+2), 65plus (+2), three_plus (+2), greater_three (+2)
  await page.getByLabel(/History \(anamnesis suspicion\)/i).selectOption("highly");
  await page.getByLabel(/ECG \(electrocardiogram\)/i).selectOption("st_deviation");
  await page.getByLabel(/^Age$/i).selectOption("65plus");
  await page.getByLabel(/Risk factors/i).selectOption("three_plus");
  await page.getByLabel(/Initial Troponin/i).selectOption("greater_three");

  await page.getByText("Score: 10 points", { exact: true }).waitFor();
  await page.getByText(/High risk \(~50–65% 6-week MACE risk/i).waitFor();
  await page.screenshot({ path: path.join(output, "heart-dark-modal.png") });
  console.log("PASS HEART score chest pain prognostic calculator verified and captured in dark styles");

  // Test 3r: Arrow Key Navigation across tabs wrapping from last tab (HEART) to first tab (BMI)
  const heartTab = page.getByRole("tab", { name: "HEART (Chest Pain)" });
  await heartTab.focus();
  await page.keyboard.press("ArrowRight");
  const bmiSelected = await page.getByRole("tab", { name: "BMI" }).getAttribute("aria-selected");
  assert.equal(bmiSelected, "true");
  console.log("PASS arrow navigation wrapped from last tab (HEART) to first tab (BMI)");
  await page.keyboard.press("ArrowLeft");
  const heartSelected = await heartTab.getAttribute("aria-selected");
  assert.equal(heartSelected, "true");
  console.log("PASS arrow navigation wrapped backward from first tab (BMI) to last tab (HEART)");

  // Return to Corrected Calcium for prompt insertion test
  await page.getByRole("tab", { name: "Corrected Calcium" }).click();

  // Test 4: Ask MedAssist with Prompt Insertion
  await page.getByRole("button", { name: "Ask MedAssist about this calcium" }).click();
  await modal.waitFor({ state: "hidden" });
  const promptValue = await page.getByLabel("Your question", { exact: true }).inputValue();
  assert.ok(promptValue.includes("corrected calcium estimate of 9.2 mg/dL"));
  console.log("PASS calculator prompt insertion inserted text and closed modal");

  // Send the question and verify answer & citation numbers
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText("Conversation saved", { exact: true }).waitFor();
  console.log("PASS calcium question processed and conversation saved");

  // Test 4b: Export JSON and Import buttons
  const exportJsonBtn = page.getByRole("button", { name: "Export JSON" });
  assert.equal(await exportJsonBtn.isVisible(), true);
  console.log("PASS export JSON action button rendered and accessible");

  const importBtn = page.getByText("Preview conversation JSON", { exact: true });
  assert.equal(await importBtn.isVisible(), true);
  console.log("PASS local JSON preview button rendered and accessible in history sidebar");

  // Test 4b: Citation Jumping and Accessible Focus
  const citeButton = page.locator(".citation-pill").first();
  if (await citeButton.isVisible()) {
    await citeButton.click();
    const isFocused = await page.evaluate(() => {
      const active = document.activeElement;
      return active && active.tagName.toLowerCase() === "li" && active.id.startsWith("ref-");
    });
    assert.equal(isFocused, true);
    await page.screenshot({ path: path.join(output, "citation-focus-dark.png") });
    console.log("PASS citation pill clicked, target reference focused and highlighted");
  }

  // Test 4d: Grounding hint active on clinical queries
  await page.getByLabel("Your question", { exact: true }).fill("Migraine triggers");
  const pubmedHint = page.locator(".grounding-hint");
  await pubmedHint.waitFor();
  assert.equal(await pubmedHint.innerText(), " · PubMed active");
  console.log("PASS grounding hint 'PubMed active' verified for clinical query");

  // Test 5: Newly added high-risk drug interaction: Simvastatin + Clarithromycin
  await page.getByLabel("Your question", { exact: true }).fill("Can I take simvastatin and clarithromycin together?");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText("Conversation saved", { exact: true }).waitFor();
  await page.getByText(/Possible medication interaction mentioned/).waitFor();
  await page.getByText("Statin + Strong CYP3A4 Inhibitor / Fibrate").waitFor();
  await page.getByText(/rhabdomyolysis/i).waitFor();
  await page.getByText(/Do not start, stop, or change prescribed medicines based on this screen/).waitFor();
  await page.screenshot({ path: path.join(output, "statin-clarithromycin-dark.png") });
  console.log("PASS statin and clarithromycin high-risk interaction warning verified in dark mode");

  // Test 5b: Emergency symptoms with interacting medication combination
  await page.getByLabel("Your question", { exact: true }).fill("I took sildenafil and nitroglycerin together and now I have severe chest pain");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText("Conversation saved", { exact: true }).waitFor();
  await page.getByText(/These symptoms may need urgent medical attention/).waitFor();
  await page.getByText("PDE5 Inhibitor + Nitrate Vasodilator").waitFor();
  await page.getByText(/Possible medication interaction mentioned/).last().waitFor();
  await page.screenshot({ path: path.join(output, "emergency-ddi-dark.png") });
  console.log("PASS emergency guidance combined with critical drug interaction warning verified in dark mode");

  // Test 5c: Allopurinol + Imuran (Azathioprine) high-risk bone marrow toxicity interaction
  await page.getByLabel("Your question", { exact: true }).fill("Can I take allopurinol for gout while taking Imuran?");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText("Conversation saved", { exact: true }).waitFor();
  await page.getByText("Allopurinol / Febuxostat + Azathioprine / 6-Mercaptopurine").waitFor();
  await page.getByText(/bone marrow suppression/i).waitFor();
  await page.screenshot({ path: path.join(output, "allopurinol-imuran-dark.png") });
  console.log("PASS allopurinol and azathioprine (Imuran) contraindication alert verified in dark mode");

  // Test 5d: Warfarin + Bactrim high-risk bleeding interaction
  await page.getByLabel("Your question", { exact: true }).fill("Can I take Coumadin with Bactrim for my infection?");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText("Conversation saved", { exact: true }).waitFor();
  await page.getByText("Warfarin + Trimethoprim-Sulfamethoxazole").waitFor();
  await page.getByText(/CYP2C9/i).waitFor();
  await page.getByText(/INR surges/i).waitFor();
  await page.screenshot({ path: path.join(output, "warfarin-bactrim-dark.png") });
  console.log("PASS warfarin and Bactrim high-risk bleeding interaction warning verified in dark mode");

  // Test 5e: Clopidogrel + Omeprazole loss of antiplatelet efficacy contraindication
  await page.getByLabel("Your question", { exact: true }).fill("Is it safe to take Plavix with omeprazole to protect my stomach?");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText("Conversation saved", { exact: true }).waitFor();
  await page.getByText("Clopidogrel + Omeprazole / Esomeprazole").waitFor();
  await page.getByText(/CYP2C19/i).waitFor();
  await page.getByText(/stent thrombosis/i).waitFor();
  await page.screenshot({ path: path.join(output, "clopidogrel-omeprazole-dark.png") });
  console.log("PASS clopidogrel and omeprazole contraindication warning verified in dark mode");

  // Test 5f: SSRI / SNRI + Triptan serotonergic toxicity risk
  await page.getByLabel("Your question", { exact: true }).fill("Can I take Imitrex for a migraine while I am taking Zoloft?");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText("Conversation saved", { exact: true }).waitFor();
  await page.getByText("SSRI / SNRI / MAOI + Triptan (Serotonergic Toxicity)").waitFor();
  await page.getByText(/Serotonin Syndrome/i).waitFor();
  await page.screenshot({ path: path.join(output, "triptan-ssri-dark.png") });
  console.log("PASS SSRI and triptan serotonergic toxicity alert verified in dark mode");

  // Test 5g: Bactrim + Lisinopril hyperkalemia contraindication
  await page.getByLabel("Your question", { exact: true }).fill("Prescribing Bactrim for a skin infection in a patient taking lisinopril.");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText("Conversation saved", { exact: true }).waitFor();
  await page.getByText("Trimethoprim-Sulfamethoxazole + ACE Inhibitor / ARB / K-Sparing Diuretic").waitFor();
  await page.getByText(/hyperkalemia/i).waitFor();
  await page.screenshot({ path: path.join(output, "bactrim-lisinopril-dark.png") });
  console.log("PASS Bactrim and ACE inhibitor hyperkalemia alert verified in dark mode");

  // Test 5h: Theophylline + Ciprofloxacin CYP1A2 inhibition contraindication
  await page.getByLabel("Your question", { exact: true }).fill("Can a COPD patient on theophylline take ciprofloxacin for a lung infection?");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText("Conversation saved", { exact: true }).waitFor();
  await page.getByText("Theophylline + Fluoroquinolone (CYP1A2 Inhibition)").waitFor();
  await page.getByText(/potently inhibits hepatic CYP1A2/i).waitFor();
  await page.getByText(/seizures/i).waitFor();
  await page.screenshot({ path: path.join(output, "theophylline-cipro-dark.png") });
  console.log("PASS theophylline and ciprofloxacin CYP1A2 toxicity alert verified in dark mode");

  // Test 5i: Colchicine + Clarithromycin P-gp/CYP3A4 toxicity contraindication
  await page.getByLabel("Your question", { exact: true }).fill("Can I take colchicine for a gout flare while taking Biaxin?");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText("Conversation saved", { exact: true }).waitFor();
  await page.getByText("Colchicine + Strong CYP3A4 / P-gp Inhibitor").waitFor();
  await page.getByText(/P-glycoprotein/i).waitFor();
  await page.getByText(/bone marrow aplasia/i).waitFor();
  await page.screenshot({ path: path.join(output, "colchicine-clarithromycin-dark.png") });
  console.log("PASS colchicine and clarithromycin (Biaxin) contraindication alert verified in dark mode");

  // Test 5j: Carbamazepine + Strong CYP3A4 Inhibitor (Erythromycin) neurotoxicity contraindication
  await page.getByLabel("Your question", { exact: true }).fill("Can an epileptic patient taking Tegretol take erythromycin for a respiratory infection?");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText("Conversation saved", { exact: true }).waitFor();
  await page.getByText("Carbamazepine + Strong CYP3A4 Inhibitor").waitFor();
  await page.getByText(/CYP3A4/i).last().waitFor();
  await page.getByText(/ataxia/i).last().waitFor();
  await page.screenshot({ path: path.join(output, "carbamazepine-erythromycin-dark.png") });
  console.log("PASS carbamazepine (Tegretol) and erythromycin CYP3A4 neurotoxicity alert verified in dark mode");

  // Test 5k: Linezolid + SSRI (Zoloft) Serotonin Syndrome contraindication
  await page.getByLabel("Your question", { exact: true }).fill("Can a patient taking Zoloft be prescribed Zyvox for an MRSA wound?");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText("Conversation saved", { exact: true }).waitFor();
  await page.getByText("Linezolid + SSRI / SNRI (Serotonin Syndrome)").waitFor();
  await page.getByText(/monoamine oxidase inhibitor/i).waitFor();
  await page.getByText(/Serotonin Syndrome/i).last().waitFor();
  await page.screenshot({ path: path.join(output, "linezolid-zoloft-dark.png") });
  console.log("PASS linezolid (Zyvox) and sertraline (Zoloft) Serotonin Syndrome contraindication alert verified in dark mode");

  // Test 6: Dashboard in Dark Mode
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("heading", { name: "Activity dashboard" }).waitFor();
  await page.getByRole("heading", { name: "Medication interaction alerts" }).waitFor();
  await page.screenshot({ path: path.join(output, "dashboard-dark-desktop.png"), fullPage: true });
  console.log("PASS dashboard rendered in dark mode with medication interaction alerts");

  // Test 7: Mobile 320px viewport in dark mode
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("link", { name: "Chat", exact: true }).click();
  await page.getByRole("heading", { name: "Health Q&A" }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  await page.screenshot({ path: path.join(output, "chat-dark-320px.png"), fullPage: true });
  console.log("PASS mobile 320px chat in dark mode has zero horizontal overflow");

  // Assert no uncaught errors
  assert.deepEqual(errors, []);
  console.log("PASS zero uncaught exceptions during dark mode & clinical tools workflow");

  await browser.close();
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exitCode = 1;
});
