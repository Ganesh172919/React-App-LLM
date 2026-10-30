const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../frontend/src/components/chat/ChatWorkspace.jsx");
let content = fs.readFileSync(filePath, "utf8");

const oldStatus = `{!error && !busy && status === "Saved" && <span className="small-text muted" role="status">Conversation saved</span>}`;
const newStatus = `{!error && !busy && status && <span className="small-text muted" role="status">{status === "Saved" ? "Conversation saved" : status}</span>}`;

const normContent = content.replace(/\r\n/g, "\n");
const normOldStatus = oldStatus.replace(/\r\n/g, "\n");
const normNewStatus = newStatus.replace(/\r\n/g, "\n");

if (!normContent.includes(normOldStatus)) {
  console.error("Failed to find oldStatus in ChatWorkspace.jsx");
  process.exit(1);
}

let patched = normContent.replace(normOldStatus, normNewStatus);
if (content.includes("\r\n")) {
  patched = patched.replace(/\n/g, "\r\n");
}

fs.writeFileSync(filePath, patched, "utf8");
console.log("Successfully patched ChatWorkspace.jsx for visible status messages");
