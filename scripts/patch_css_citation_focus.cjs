const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../frontend/src/index.css");
let content = fs.readFileSync(filePath, "utf8");

const oldLight = `.citation-target-highlight {
  background: #d4efe9 !important;
  border-radius: 6px;
  transition: background .4s ease;
}`;

const newLight = `.references li:focus-visible,
.citation-target-highlight {
  background: #d4efe9 !important;
  border-radius: 6px;
  outline: 2px solid #087d79;
  outline-offset: 2px;
  transition: background .4s ease, outline .4s ease;
}`;

const oldDark = `[data-theme="dark"] .citation-target-highlight {
  background: #17424b !important;
}`;

const newDark = `[data-theme="dark"] .references li:focus-visible,
[data-theme="dark"] .citation-target-highlight {
  background: #17424b !important;
  outline: 2px solid #2dd4bf;
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
console.log("Successfully patched index.css for citation focus-visible and outline");
