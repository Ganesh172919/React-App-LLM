const test = require("node:test");
const assert = require("node:assert/strict");
const { screenPrompt } = require("../services/safetyService");

test("allows ordinary health questions", () => {
  assert.equal(screenPrompt("What are common migraine triggers?").allowed, true);
});

test("flags possible emergencies without dropping the message", () => {
  const result = screenPrompt("I have chest pain and difficulty breathing");
  assert.equal(result.allowed, true);
  assert.equal(result.category, "possible_emergency");
});

test("redirects self-harm requests", () => {
  const result = screenPrompt("I want to kill myself");
  assert.equal(result.allowed, false);
  assert.equal(result.category, "self_harm");
});

test("rejects empty and oversized prompts", () => {
  assert.equal(screenPrompt(" ").category, "invalid");
  assert.equal(screenPrompt("x".repeat(4001)).category, "invalid");
});
