const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../frontend/src/components/chat/ChatWorkspace.jsx");
let content = fs.readFileSync(filePath, "utf8");

const oldRefs = `const historyRequest = useRef(0); const controller = useRef(null); const messagesPane = useRef(null); const composerInput = useRef(null); const deleteDialog = useRef(null); const clearAllDialog = useRef(null); const drawer = useRef(null);`;
const newRefs = `const historyRequest = useRef(0); const controller = useRef(null); const messagesPane = useRef(null); const composerInput = useRef(null); const deleteDialog = useRef(null); const clearAllDialog = useRef(null); const drawer = useRef(null); const importFileInput = useRef(null);`;

const oldExportJson = `  const exportActiveJson = () => {
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

const newExportJson = `  const exportActiveJson = () => {
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
  };
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const fileText = typeof file.text === "function"
        ? await file.text()
        : await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result);
            reader.onerror = () => rej(reader.error);
            reader.readAsText(file);
          });
      let parsed;
      try {
        parsed = JSON.parse(fileText);
      } catch {
        setError("Could not parse file. Please upload a valid JSON conversation export.");
        return;
      }
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.messages) || !parsed.messages.length) {
        setError("Invalid conversation file. The file must contain a 'messages' list.");
        return;
      }
      const validMessages = parsed.messages.filter((m) => m && typeof m.text === "string" && typeof m.isUser === "boolean");
      if (!validMessages.length) {
        setError("No valid messages found in the imported file.");
        return;
      }
      view.current++;
      selectActive(null);
      const importedTitle = typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "Imported conversation";
      setActiveName(importedTitle);
      setMessages(validMessages);
      setError("");
      setStatus("Imported conversation loaded into workspace");
      setSidebarOpen(false);
    } catch (err) {
      setError("Failed to read file: " + err.message);
    }
  };`;

const oldButton = `<button className="button full-width" onClick={newChat} disabled={navigationLocked}>New conversation</button>`;
const newButton = `<button className="button full-width" onClick={newChat} disabled={navigationLocked}>New conversation</button>
        <button type="button" className="button secondary full-width" style={{ marginTop: "6px" }} onClick={() => importFileInput.current?.click()} disabled={navigationLocked} title="Import a previously saved conversation JSON file">Import conversation</button>
        <input ref={importFileInput} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleImportFile} aria-label="Upload conversation JSON" />`;

const normContent = content.replace(/\r\n/g, "\n");
const normOldRefs = oldRefs.replace(/\r\n/g, "\n");
const normNewRefs = newRefs.replace(/\r\n/g, "\n");
const normOldExportJson = oldExportJson.replace(/\r\n/g, "\n");
const normNewExportJson = newExportJson.replace(/\r\n/g, "\n");
const normOldButton = oldButton.replace(/\r\n/g, "\n");
const normNewButton = newButton.replace(/\r\n/g, "\n");

if (!normContent.includes(normOldRefs)) {
  console.error("Failed to find oldRefs");
  process.exit(1);
}
if (!normContent.includes(normOldExportJson)) {
  console.error("Failed to find oldExportJson");
  process.exit(1);
}
if (!normContent.includes(normOldButton)) {
  console.error("Failed to find oldButton");
  process.exit(1);
}

let patched = normContent
  .replace(normOldRefs, normNewRefs)
  .replace(normOldExportJson, normNewExportJson)
  .replace(normOldButton, normNewButton);

if (content.includes("\r\n")) {
  patched = patched.replace(/\n/g, "\r\n");
}

fs.writeFileSync(filePath, patched, "utf8");
console.log("Successfully patched ChatWorkspace.jsx with conversation import functionality");
