const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../frontend/src/components/chat/ChatWorkspace.jsx");
let content = fs.readFileSync(filePath, "utf8");

const oldCode = `    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.innerWidth <= 700) setSidebarOpen(true);
        drawer.current?.querySelector("input")?.focus();
      }
    };`;

const newCode = `    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.innerWidth <= 700) setSidebarOpen(true);
        drawer.current?.querySelector("input")?.focus();
      } else if (event.altKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        setCalcModalOpen((prev) => !prev);
      }
    };`;

const oldBtn = `<button type="button" className="text-button small-text" onClick={() => setCalcModalOpen(true)} title="Open clinical reference calculators (BMI, eGFR, CHA2DS2-VASc, MAP)">Clinical tools</button>`;
const newBtn = `<button type="button" className="text-button small-text" onClick={() => setCalcModalOpen(true)} title="Open clinical reference calculators (BMI, eGFR, CHA2DS2-VASc, MAP, CrCl, Ca, Anion Gap, FeNa) (Alt+C)" aria-keyshortcuts="Alt+C">Clinical tools</button>`;

const normContent = content.replace(/\r\n/g, "\n");
const normOldCode = oldCode.replace(/\r\n/g, "\n");
const normNewCode = newCode.replace(/\r\n/g, "\n");
const normOldBtn = oldBtn.replace(/\r\n/g, "\n");
const normNewBtn = newBtn.replace(/\r\n/g, "\n");

if (!normContent.includes(normOldCode)) {
  console.error("Failed to find oldCode in ChatWorkspace.jsx");
  process.exit(1);
}
if (!normContent.includes(normOldBtn)) {
  console.error("Failed to find oldBtn in ChatWorkspace.jsx");
  process.exit(1);
}

let patched = normContent.replace(normOldCode, normNewCode).replace(normOldBtn, normNewBtn);
if (content.includes("\r\n")) {
  patched = patched.replace(/\n/g, "\r\n");
}

fs.writeFileSync(filePath, patched, "utf8");
console.log("Successfully patched ChatWorkspace.jsx for Alt+C shortcut and aria-keyshortcuts");
