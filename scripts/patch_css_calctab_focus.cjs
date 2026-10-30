const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../frontend/src/index.css");
let content = fs.readFileSync(filePath, "utf8");

const oldLight = `.calc-tab:hover {
  background: #f0f7f6;
  color: #0c6d67;
}`;

const newLight = `.calc-tab:hover {
  background: #f0f7f6;
  color: #0c6d67;
}
.calc-tab:focus-visible {
  outline: 2px solid #087d79;
  outline-offset: 2px;
}`;

const oldDark = `[data-theme="dark"] .calc-tab.active {
  background: #111c2e;
  border-color: #0d9488;
  color: #2dd4bf;
}`;

const newDark = `[data-theme="dark"] .calc-tab.active {
  background: #111c2e;
  border-color: #0d9488;
  color: #2dd4bf;
}
[data-theme="dark"] .calc-tab:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}`;

const normContent = content.replace(/\r\n/g, "\n");
const normOldLight = oldLight.replace(/\r\n/g, "\n");
const normNewLight = newLight.replace(/\r\n/g, "\n");
const normOldDark = oldDark.replace(/\r\n/g, "\n");
const normNewDark = newDark.replace(/\r\n/g, "\n");

if (!normContent.includes(normOldLight)) {
  console.error("Failed to find oldLight in index.css");
  process.exit(1);
}
if (!normContent.includes(normOldDark)) {
  console.error("Failed to find oldDark in index.css");
  process.exit(1);
}

let patched = normContent.replace(normOldLight, normNewLight).replace(normOldDark, normNewDark);
if (content.includes("\r\n")) {
  patched = patched.replace(/\n/g, "\r\n");
}

fs.writeFileSync(filePath, patched, "utf8");
console.log("Successfully patched index.css for calc-tab:focus-visible");
