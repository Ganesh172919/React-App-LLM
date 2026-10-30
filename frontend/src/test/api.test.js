import { afterEach, expect, it, vi } from "vitest";
import React from "react";
import ReactMarkdown from "react-markdown";
import { renderToStaticMarkup } from "react-dom/server";
import { formatChatAsMarkdown } from "../lib/api";
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
const response = (status, body) => ({ ok: status < 400, status, headers: new Headers({ "content-type": "application/json" }), json: async () => body });
it("concurrent expired requests share one refresh and retry once", async () => {
  let refreshes = 0; let refreshed = false;
  vi.stubGlobal("fetch", vi.fn(async (url) => {
    if (url.endsWith("/auth/refresh-token")) { refreshes++; await new Promise((resolve) => setTimeout(resolve, 10)); refreshed = true; return response(200, { user: { id: "test" } }); }
    return refreshed ? response(200, { items: [] }) : response(401, { code: "ACCESS_EXPIRED" });
  }));
  const { apiRequest } = await import("../lib/api");
  await Promise.all([apiRequest("/history"), apiRequest("/history")]); expect(refreshes).toBe(1);
});
it("a forbidden request never triggers refresh or another generation", async () => {
  const fetch = vi.fn(async () => response(403, { message: "Forbidden" })); vi.stubGlobal("fetch", fetch);
  const { apiRequest } = await import("../lib/api"); await expect(apiRequest("/ai/chat")).rejects.toMatchObject({ status: 403 }); expect(fetch).toHaveBeenCalledTimes(1);
});
it("a failed refresh ends the session without an infinite retry", async () => {
  const fetch = vi.fn(async () => response(401, { message: "Session expired" })); vi.stubGlobal("fetch", fetch);
  const ended = vi.fn(); window.addEventListener("session-ended", ended);
  const { apiRequest } = await import("../lib/api"); await expect(apiRequest("/history")).rejects.toMatchObject({ status: 401 }); expect(fetch).toHaveBeenCalledTimes(2); expect(ended).toHaveBeenCalledTimes(1);
  window.removeEventListener("session-ended", ended);
});
it("exports imported answers with an unverified label and inert message text", () => {
  const markdown = formatChatAsMarkdown({
    title: "Imported <img src=x>", unverifiedImport: true,
    messages: [
      { isUser: true, text: "Read [this](https://example.invalid/track) ![pixel](https://example.invalid/pixel)" },
      { isUser: false, text: "Unverified answer [1]\n```\n![another](https://example.invalid/another)" },
    ],
  });
  const rendered = renderToStaticMarkup(React.createElement(ReactMarkdown, null, markdown));
  expect(markdown).toContain("Unverified local conversation preview");
  expect(markdown).toContain("### Imported answer (unverified)");
  expect(markdown).not.toContain("MedAssist AI Evidence Report");
  expect(rendered).not.toContain("<img");
  expect(rendered).not.toContain("<a ");
});
it("exports only numeric PubMed reference links for saved conversations", () => {
  const markdown = formatChatAsMarkdown({ title: "Saved conversation", messages: [
    { isUser: true, text: "What is asthma?" },
    { isUser: false, text: "Answer [1]", references: [
      { pmid: "12345", title: "Evidence ] [track](https://example.invalid)", url: "https://example.invalid/pixel" },
    ] },
  ] });
  const rendered = renderToStaticMarkup(React.createElement(ReactMarkdown, null, markdown));
  expect(rendered).toContain('href="https://pubmed.ncbi.nlm.nih.gov/12345/"');
  expect(rendered).not.toContain('href="https://example.invalid');
  expect(rendered).not.toContain("<img");
});
