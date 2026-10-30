export const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
let refreshPromise;
async function request(path, options) {
  const response = await fetch(API_BASE_URL + path, { credentials: "include", ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } });
  const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(data?.message || "Request failed (" + response.status + ").");
    Object.assign(error, { status: response.status, code: data?.code, data, requestId: data?.requestId, retryAfter: Number(response.headers.get("retry-after")) || 0 });
    throw error;
  }
  return data;
}
export async function refreshSession() {
  if (!refreshPromise) {
    const refresh = () => request("/auth/refresh-token", { method: "POST" });
    refreshPromise = (navigator.locks ? navigator.locks.request("medassist-session-refresh", refresh) : refresh())
      .then((data) => { window.dispatchEvent(new Event("session-renewed")); return data; })
      .catch((error) => { window.dispatchEvent(new Event("session-ended")); throw error; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}
export async function apiRequest(path, options = {}) {
  try { return await request(path, options); }
  catch (error) {
    if (error.status === 401 && (!path.startsWith("/auth/") || path === "/auth/check")) {
      await refreshSession();
      return request(path, options);
    }
    throw error;
  }
}
export const getWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (API_BASE_URL.startsWith("http")) return API_BASE_URL.replace(/^http/, "ws").replace(/\/api$/, "/ws");
  return (window.location.protocol === "https:" ? "wss:" : "ws:") + "//" + window.location.host + "/ws";
};
export function downloadJson(filename, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename, content, mimeType = "text/markdown;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const markdownSpecials = new Set("\\`*_{}[]()#+-.!|~");
const markdownInline = (value) => String(value || "").replace(/\s+/g, " ").trim()
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/./g, (char) => markdownSpecials.has(char) ? "\\" + char : char);
const literalMarkdown = (value) => {
  const text = String(value || "").replace(/\r\n?/g, "\n");
  const longestRun = [...text.matchAll(/`+/g)].reduce((longest, [run]) => Math.max(longest, run.length), 0);
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return [fence + "text", text, fence];
};
export function formatChatAsMarkdown(chat) {
  const title = markdownInline(chat.title || "Health Q&A Conversation");
  const preview = chat.unverifiedImport === true;
  const lines = [
    `# ${title}`,
    `*${preview ? "Unverified local conversation preview" : "MedAssist AI conversation export"} · Exported ${new Date().toLocaleDateString(undefined, { dateStyle: "long" })}*`,
    "",
    "---",
    "",
  ];
  const messages = chat.messages || [];
  for (const msg of messages) {
    if (msg.isUser) {
      lines.push("### Question");
      lines.push(...literalMarkdown(msg.text));
      lines.push("");
    } else {
      lines.push(preview ? "### Imported answer (unverified)" : "### MedAssist AI response");
      lines.push(...literalMarkdown(msg.text));
      lines.push("");
      if (!preview && msg.references && msg.references.length > 0) {
        lines.push("#### PubMed Literature References");
        msg.references.forEach((ref, idx) => {
          const pmid = String(ref.pmid || "");
          const title = markdownInline(ref.title || "PubMed record");
          const authors = ref.authors?.length ? ref.authors.slice(0, 3).map(markdownInline).join(", ") + (ref.authors.length > 3 ? " et al." : "") : "";
          const meta = [authors, markdownInline(ref.journal), markdownInline(ref.pubdate)].filter(Boolean).join(" · ");
          const source = /^\d{1,12}$/.test(pmid) ? `[${title}](https://pubmed.ncbi.nlm.nih.gov/${pmid}/)` : title;
          lines.push(`${idx + 1}. ${source}${meta ? " - " + meta : ""}${pmid ? " (PMID: " + markdownInline(pmid) + ")" : ""}`);
        });
        lines.push("");
      }
    }
  }
  lines.push("---");
  lines.push(preview
    ? "*Unverified import: This text came from a local file. MedAssist AI did not generate, check, or save it. Citations and verification claims in the file were not trusted. Do not use it for care decisions.*"
    : "*Disclaimer: MedAssist AI provides educational health assistance grounded in PubMed biomedical literature. PubMed indexing alone does not establish peer review or clinical accuracy. It does not provide medical diagnoses, treatment prescriptions, or clinical verification. Always consult a qualified clinician for personal health concerns.*");
  return lines.join("\n");
}
