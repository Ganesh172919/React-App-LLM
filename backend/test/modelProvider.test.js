const { test } = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const { generateAnswer, providerConfigured } = require("../services/modelProvider");
const { verifyAnswer } = require("../services/answerVerifier");

test("Together sends bounded chat messages and rejects incomplete answers", async (t) => {
  const old = { ...process.env };
  t.after(() => { for (const key of ["AI_PROVIDER", "TOGETHER_API_KEY", "TOGETHER_MODEL"]) old[key] === undefined ? delete process.env[key] : process.env[key] = old[key]; });
  process.env.AI_PROVIDER = "together"; process.env.TOGETHER_API_KEY = "test-key"; process.env.TOGETHER_MODEL = "test-model";
  let finish = "stop";
  t.mock.method(axios, "post", async (url, payload, options) => {
    assert.equal(url, "https://api.together.xyz/v1/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    assert.equal(payload.messages[0].role, "system");
    return { data: { choices: [{ finish_reason: finish, message: { content: "Test response" } }] } };
  });
  assert.equal((await generateAnswer({ prompt: "hello", systemInstruction: "instruction" })).provider, "Together AI");
  finish = "length";
  await assert.rejects(generateAnswer({ prompt: "hello", systemInstruction: "instruction" }), { code: "AI_INCOMPLETE_RESPONSE" });
});

test("local provider uses the configured endpoint and does not send an empty key", async (t) => {
  const keys = ["AI_PROVIDER", "LOCAL_AI_BASE_URL", "LOCAL_AI_MODEL", "LOCAL_AI_API_KEY"];
  const old = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  t.after(() => { for (const key of keys) old[key] === undefined ? delete process.env[key] : process.env[key] = old[key]; });
  process.env.AI_PROVIDER = "local"; process.env.LOCAL_AI_BASE_URL = "http://127.0.0.1:8000/v1"; process.env.LOCAL_AI_MODEL = "fixture"; delete process.env.LOCAL_AI_API_KEY;
  t.mock.method(axios, "post", async (url, body, options) => { assert.equal(url, "http://127.0.0.1:8000/v1/chat/completions"); assert.equal(options.headers.Authorization, undefined); return { data: { choices: [{ finish_reason: "stop", message: { content: "Local answer" } }] } }; });
  assert.equal(providerConfigured(), true);
  assert.equal((await generateAnswer({ prompt: "hello", systemInstruction: "instruction" })).text, "Local answer");
  process.env.LOCAL_AI_BASE_URL = "http://example.test/v1";
  await assert.rejects(generateAnswer({ prompt: "hello", systemInstruction: "instruction" }), /HTTPS/);
});

test("Groq uses its fixed HTTPS endpoint and the selected personal key", async (t) => {
  t.mock.method(axios, "post", async (url, payload, options) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer gsk_synthetic_personal_key");
    assert.equal(payload.model, "openai/gpt-oss-20b");
    return { data: { choices: [{ finish_reason: "stop", message: { content: "Groq fixture answer" } }] } };
  });
  const result = await generateAnswer({ prompt: "hello", systemInstruction: "instruction", providerConfig: { provider: "groq", apiKey: "gsk_synthetic_personal_key", model: "openai/gpt-oss-20b" } });
  assert.equal(result.provider, "Groq");
});

test("model review accepts only an explicit verdict", async () => {
  const args = { question: "Q", answer: "A [1]", sourceText: "[1] evidence" };
  assert.equal((await verifyAnswer({ ...args, generate: async () => ({ text: "SUPPORTED", model: "fixture" }) })).supported, true);
  assert.equal((await verifyAnswer({ ...args, generate: async () => ({ text: "UNSUPPORTED" }) })).supported, false);
  await assert.rejects(verifyAnswer({ ...args, generate: async () => ({ text: "probably supported" }) }));
});
