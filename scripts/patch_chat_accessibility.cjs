const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../frontend/src/components/chat/ChatWorkspace.jsx");
let content = fs.readFileSync(filePath, "utf8");

// 1. Update jumpToRef to include el.focus?.({ preventScroll: true });
const oldJump = `  const jumpToRef = (messageKey, refNum) => {
    const el = document.getElementById("ref-" + messageKey + "-" + refNum);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      el.classList.add("citation-target-highlight");
      setTimeout(() => el.classList.remove("citation-target-highlight"), 2200);
    }
  };`;

const newJump = `  const jumpToRef = (messageKey, refNum) => {
    const el = document.getElementById("ref-" + messageKey + "-" + refNum);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      el.classList.add("citation-target-highlight");
      el.focus?.({ preventScroll: true });
      setTimeout(() => el.classList.remove("citation-target-highlight"), 2200);
    }
  };`;

const oldRefLi = `              return <li id={"ref-" + refKey} key={reference.pmid || i}>`;
const newRefLi = `              return <li id={"ref-" + refKey} key={reference.pmid || i} tabIndex={-1} aria-label={"Reference " + (i + 1)}>`;

// Handle both CRLF and LF
const normContent = content.replace(/\r\n/g, "\n");
const normOldJump = oldJump.replace(/\r\n/g, "\n");
const normNewJump = newJump.replace(/\r\n/g, "\n");
const normOldRefLi = oldRefLi.replace(/\r\n/g, "\n");
const normNewRefLi = newRefLi.replace(/\r\n/g, "\n");

if (!normContent.includes(normOldJump)) {
  console.error("Failed to find oldJump in ChatWorkspace.jsx");
  process.exit(1);
}
if (!normContent.includes(normOldRefLi)) {
  console.error("Failed to find oldRefLi in ChatWorkspace.jsx");
  process.exit(1);
}

let patched = normContent.replace(normOldJump, normNewJump).replace(normOldRefLi, normNewRefLi);
if (content.includes("\r\n")) {
  patched = patched.replace(/\n/g, "\r\n");
}

fs.writeFileSync(filePath, patched, "utf8");
console.log("Successfully patched ChatWorkspace.jsx for citation keyboard focus and accessibility");
