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
