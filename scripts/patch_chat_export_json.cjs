const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../frontend/src/components/chat/ChatWorkspace.jsx");
let content = fs.readFileSync(filePath, "utf8");

const oldExport = `  const exportActiveMarkdown = () => {
    if (!messages.length) return;
    try {
      const activeTitle = sessions.find((session) => session.id === active)?.title || activeName || "Health Q&A";
      const md = formatChatAsMarkdown({ title: activeTitle, sessionId: activeRef.current, messages });
      downloadText("medassist-chat-" + (activeRef.current || "current") + ".md", md);
    } catch (err) { setError(err.message); }
  };`;

const newExport = `  const exportActiveMarkdown = () => {
    if (!messages.length) return;
    try {
      const activeTitle = sessions.find((session) => session.id === active)?.title || activeName || "Health Q&A";
      const md = formatChatAsMarkdown({ title: activeTitle, sessionId: activeRef.current, messages });
      downloadText("medassist-chat-" + (activeRef.current || "current") + ".md", md);
    } catch (err) { setError(err.message); }
  };
  const exportActiveJson = () => {
    if (!messages.length) return;
    try {
      const activeTitle = sessions.find((session) => session.id === active)?.title || activeName || "Health Q&A";
      downloadJson("medassist-chat-" + (activeRef.current || "current") + ".json", {
        title: activeTitle,
        sessionId: activeRef.current,
        exportedAt: new Date().toISOString(),
        messages,
      });
    } catch (err) { setError(err.message); }
  };`;

const oldBtns = `                  <button className="text-button small-text" onClick={exportActiveMarkdown} title="Export as structured Markdown document">Export Markdown</button>
                  <button className="text-button small-text" onClick={() => window.print()} title="Print or save as PDF">Print</button>`;

const newBtns = `                  <button className="text-button small-text" onClick={exportActiveMarkdown} title="Export as structured Markdown document">Export Markdown</button>
                  <button className="text-button small-text" onClick={exportActiveJson} title="Export structured conversation as JSON">Export JSON</button>
                  <button className="text-button small-text" onClick={() => window.print()} title="Print or save as PDF">Print</button>`;

const normContent = content.replace(/\r\n/g, "\n");
const normOldExport = oldExport.replace(/\r\n/g, "\n");
const normNewExport = newExport.replace(/\r\n/g, "\n");
const normOldBtns = oldBtns.replace(/\r\n/g, "\n");
const normNewBtns = newBtns.replace(/\r\n/g, "\n");

if (!normContent.includes(normOldExport)) {
  console.error("Failed to find oldExport in ChatWorkspace.jsx");
  process.exit(1);
}
if (!normContent.includes(normOldBtns)) {
  console.error("Failed to find oldBtns in ChatWorkspace.jsx");
  process.exit(1);
}

let patched = normContent.replace(normOldExport, normNewExport).replace(normOldBtns, normNewBtns);
if (content.includes("\r\n")) {
  patched = patched.replace(/\n/g, "\r\n");
}

fs.writeFileSync(filePath, patched, "utf8");
console.log("Successfully patched ChatWorkspace.jsx for exportActiveJson");
