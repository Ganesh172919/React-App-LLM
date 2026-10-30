export const MAX_IMPORT_BYTES = 512 * 1024;
const MAX_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 20000;

export function parseConversationImport(jsonText) {
  if (typeof jsonText !== "string" || new TextEncoder().encode(jsonText).length > MAX_IMPORT_BYTES) {
    throw new Error("The JSON file must be 512 KB or smaller.");
  }
  let parsed;
  try { parsed = JSON.parse(jsonText); }
  catch { throw new Error("Could not parse file. Please choose a valid JSON conversation export."); }
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.messages) || !parsed.messages.length) {
    throw new Error("The file must contain a nonempty messages list.");
  }
  if (parsed.messages.length > MAX_MESSAGES || parsed.messages.length % 2 !== 0) {
    throw new Error("A preview supports up to 100 complete question-and-answer pairs.");
  }
  const messages = parsed.messages.map((message, index) => {
    if (!message || typeof message !== "object" || message.isUser !== (index % 2 === 0) ||
        typeof message.text !== "string" || !message.text.trim() || message.text.length > MAX_MESSAGE_LENGTH) {
      throw new Error("Each imported exchange must have one question and one answer of 20,000 characters or fewer.");
    }
    const timestamp = typeof message.timestamp === "string" && Number.isFinite(Date.parse(message.timestamp))
      ? new Date(message.timestamp).toISOString() : undefined;
    // Exported verification, citations, IDs, and provider metadata are untrusted.
    return { id: `import-${index}`, isUser: message.isUser, text: message.text, ...(timestamp ? { timestamp } : {}) };
  });
  const title = typeof parsed.title === "string"
    ? parsed.title.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80)
    : "";
  return { title: title || "Imported conversation", messages };
}
