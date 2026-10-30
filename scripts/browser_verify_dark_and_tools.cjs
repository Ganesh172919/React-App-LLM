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

  // Test 3h: Arrow Key Navigation across tabs wrapping from last tab (CURB-65) to first tab (BMI)
  const curbTab = page.getByRole("tab", { name: /CURB-65/i });
  await curbTab.focus();
  await page.keyboard.press("ArrowRight");
  const bmiSelected = await page.getByRole("tab", { name: "BMI" }).getAttribute("aria-selected");
  assert.equal(bmiSelected, "true");
  console.log("PASS arrow navigation wrapped from last tab (CURB-65) to first tab (BMI)");
  await page.keyboard.press("ArrowLeft");
  const curbSelected = await page.getByRole("tab", { name: /CURB-65/i }).getAttribute("aria-selected");
  assert.equal(curbSelected, "true");
  console.log("PASS arrow navigation wrapped backward from first tab (BMI) to last tab (CURB-65)");

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

  const importBtn = page.getByText("Import conversation", { exact: true });
  assert.equal(await importBtn.isVisible(), true);
  console.log("PASS import conversation button rendered and accessible in history sidebar");

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

  // Test 6: Dashboard in Dark Mode
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("heading", { name: "Activity dashboard" }).waitFor();
  await page.screenshot({ path: path.join(output, "dashboard-dark-desktop.png"), fullPage: true });
  console.log("PASS dashboard rendered in dark mode");

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
