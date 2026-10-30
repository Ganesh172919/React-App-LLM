const { test } = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const { orderedRecords, parseAbstracts, fetchSources } = require("../services/pubmedService");
const { generateWithGemini } = require("../services/aiService");
const { screenPrompt } = require("../services/safetyService");
const { validateConfig } = require("../services/config");
test("PubMed numeric keys retain every requested record in source order", () => {
  for (const ids of [["123"], ["456", "123"], ["789", "123", "456"]]) {
    const result = { uids: ids }; for (const uid of ids) result[uid] = { uid, title: "Record " + uid };
    assert.deepEqual(orderedRecords(result).map((record) => record.uid), ids);
  }
  assert.deepEqual(orderedRecords(null), []);
});
test("abstract XML preserves PMID mapping and structured passages", () => {
  const xml = '<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID Version="1">123</PMID><Article><Abstract><AbstractText Label="BACKGROUND">First passage.</AbstractText><AbstractText Label="RESULTS">Second passage.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>';
  assert.equal(parseAbstracts(xml).get("123"), "First passage.\nSecond passage.");
  assert.equal(parseAbstracts("<PubmedArticleSet/>").size, 0);
});
test("PubMed HTTP workflow maps summaries and fetched abstracts", async (context) => {
  let calls = 0;
  context.mock.method(axios, "get", async (url) => {
    calls++;
    if (url.endsWith("esearch.fcgi")) return { data: { esearchresult: { idlist: ["123"] } } };
    if (url.endsWith("esummary.fcgi")) return { data: { result: { uids: ["123"], 123: { uid: "123", title: "A source", authors: [{ name: "Test Author" }] } } } };
    return { data: "<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>123</PMID><Article><Abstract><AbstractText>Evidence passage.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>" };
  });
  const sources = await fetchSources("migraine"); assert.equal(calls, 3); assert.equal(sources[0].abstract, "Evidence passage."); assert.equal(sources[0].url, "https://pubmed.ncbi.nlm.nih.gov/123/");
});
test("Gemini normalizes blocked, truncated, empty, and completed outputs", async (context) => {
  process.env.GEMINI_API_KEY = "synthetic-test-key"; let data;
  context.mock.method(axios, "post", async (url, body, options) => { assert.equal(options.headers["x-goog-api-key"], "synthetic-test-key"); assert.equal(body.systemInstruction.parts[0].text, "Instruction"); return { data }; });
  for (const finishReason of ["MAX_TOKENS", "SAFETY", "RECITATION"]) {
    data = { candidates: [{ finishReason, content: { parts: [{ text: "Incomplete output" }] } }] };
    await assert.rejects(generateWithGemini({ prompt: "hello", systemInstruction: "Instruction" }), { code: "AI_INCOMPLETE_RESPONSE" });
  }
  data = { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "Completed output" }] } }] };
  assert.equal((await generateWithGemini({ prompt: "hello", systemInstruction: "Instruction" })).text, "Completed output");
  data = { candidates: [{ finishReason: "STOP", content: { parts: [] } }] };
  await assert.rejects(generateWithGemini({ prompt: "hello", systemInstruction: "Instruction" }), { code: "AI_EMPTY_RESPONSE" });
  delete process.env.GEMINI_API_KEY;
});
test("educational and negated symptoms do not hide a second urgent symptom", () => {
  assert.equal(screenPrompt("What is a stroke?").category, "allowed");
  assert.equal(screenPrompt("I do not have chest pain").category, "allowed");
  assert.equal(screenPrompt("No chest pain but difficulty breathing").category, "possible_emergency");
});
test("startup validation rejects placeholders and unsafe HTTPS cookies", () => {
  const keys = ["MONGO_URI", "CLIENT_ORIGIN", "NODE_ENV", "COOKIE_SECURE", "JWT_ACCESS_TOKEN", "JWT_REFRESH_TOKEN", "JWT_VERIFICATION_TOKEN", "JWT_RESET_TOKEN"];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.MONGO_URI = "mongodb://localhost/test"; process.env.CLIENT_ORIGIN = "https://example.test"; process.env.NODE_ENV = "production"; process.env.COOKIE_SECURE = "false";
    for (const [index, key] of keys.filter((key) => key.startsWith("JWT_")).entries()) process.env[key] = String(index).repeat(64);
    assert.throws(validateConfig, /COOKIE_SECURE/); process.env.COOKIE_SECURE = "true"; assert.doesNotThrow(validateConfig);
    process.env.JWT_ACCESS_TOKEN = "replace-with-secret"; assert.throws(validateConfig, /secrets/);
  } finally { for (const key of keys) if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; }
});
