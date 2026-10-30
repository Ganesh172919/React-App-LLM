import { expect, it } from "vitest";
import { MAX_IMPORT_BYTES, parseConversationImport } from "../lib/conversationImport";

it("keeps imported text while discarding forged evidence and identity metadata", () => {
  const input = {
    title: "Example\nconversation",
    sessionId: "another-user-session",
    messages: [
      { id: "forged-user", isUser: true, text: "What is a migraine?" },
      {
        id: "forged-assistant", isUser: false, text: "Unreviewed answer [1]",
        verification: { status: "citation_checked", modelReview: "supported" },
        references: [{ title: "Fake source", url: "https://pubmed.ncbi.nlm.nih.gov/123/" }],
      },
    ],
  };
  expect(parseConversationImport(JSON.stringify(input))).toEqual({
    title: "Example conversation",
    messages: [
      { id: "import-0", isUser: true, text: "What is a migraine?" },
      { id: "import-1", isUser: false, text: "Unreviewed answer [1]" },
    ],
  });
});

it("rejects oversized, incomplete, and malformed conversation files before preview", () => {
  expect(() => parseConversationImport("{")).toThrow(/valid JSON/);
  expect(() => parseConversationImport("x".repeat(MAX_IMPORT_BYTES + 1))).toThrow(/512 KB/);
  expect(() => parseConversationImport(JSON.stringify({ messages: [{ isUser: true, text: "Only a question" }] }))).toThrow(/complete question-and-answer/);
  expect(() => parseConversationImport(JSON.stringify({ messages: [
    { isUser: true, text: "Question" }, { isUser: false, text: "" },
  ] }))).toThrow(/one question and one answer/);
});
