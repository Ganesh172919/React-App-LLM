/**
 * ============================================================================
 * MEDASSIST AI - HISTORY SEARCH UNIT TESTS (historySearch.test.js)
 * ============================================================================
 * Role:
 *   Validates text tokenization, stop-word elimination, and mathematical
 *   relevance scoring using the native Node.js test runner (`node --test`).
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: HISTORY SEARCH TEST SUITE
 * ----------------------------------------------------------------------------
 * [historySearch.test.js]
 *   │
 *   ├── Test 1: tokenize removes common stop words
 *   │     └── Confirms "What are the symptoms of migraine?" -> ["symptoms", "migraine"]
 *   │
 *   └── Test 2: relevance ranks overlapping medical text above unrelated text
 *         └── Confirms score("migraine triggers") > score("format JS date")
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: TEST ASSERTION PIPELINE
 * ----------------------------------------------------------------------------
 *  Tokenized Query ──► relevance(query, textA) > relevance(query, textB) ──► assert.ok()
 * ============================================================================
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { relevance, tokenize } = require("../services/historySearch");

test("tokenize removes common stop words", () => {
  assert.deepEqual([...tokenize("What are the symptoms of migraine?")], [
    "symptoms",
    "migraine",
  ]);
});

test("relevance ranks overlapping medical text above unrelated text", () => {
  const query = tokenize("migraine triggers and symptoms");
  const related = relevance(query, "Common migraine symptoms and triggers");
  const unrelated = relevance(query, "How to format a JavaScript date");
  assert.ok(related > unrelated);
});
