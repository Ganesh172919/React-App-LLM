/**
 * ============================================================================
 * MEDASSIST AI - SAFETY SERVICE UNIT TESTS (safetyService.test.js)
 * ============================================================================
 * Role:
 *   Validates deterministic prompt screening across all safety boundaries:
 *   ordinary health questions, emergency symptom flagging, self-harm refusal,
 *   empty input rejection, and length boundary checking.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: SAFETY TEST SUITE
 * ----------------------------------------------------------------------------
 * [safetyService.test.js]
 *   │
 *   ├── Test 1: Allows ordinary health questions (allowed: true, category: "allowed")
 *   ├── Test 2: Flags emergency symptoms without dropping (category: "possible_emergency")
 *   ├── Test 3: Redirects self-harm requests (allowed: false, category: "self_harm")
 *   └── Test 4: Rejects empty and oversized prompts (category: "invalid")
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: SAFETY TEST ASSERTION PIPELINE
 * ----------------------------------------------------------------------------
 *  Prompts ──► screenPrompt() ──► Check { allowed, category } ──► assert.equal()
 * ============================================================================
 */
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
