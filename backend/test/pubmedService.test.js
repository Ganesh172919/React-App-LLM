/**
 * ============================================================================
 * PUBMED SERVICE TEST SUITE (pubmedService.test.js)
 * ============================================================================
 * Role:
 *   Validates conversational keyword reduction, stopword elimination, and term
 *   deduplication for the PubMed query generator.
 *
 * ----------------------------------------------------------------------------
 * TEST SUITE MINDMAP
 * ----------------------------------------------------------------------------
 * [pubmedService.test.js]
 *        ├── 1. Stopword Reduction Test ("What are common migraine symptoms?" -> "migraine symptoms")
 *        └── 2. Deduplication Test ("migraine migraine treatment" -> "migraine treatment")
 *
 * ----------------------------------------------------------------------------
 * ASCII ASSERTION FLOW
 * ----------------------------------------------------------------------------
 *  "What are common migraine symptoms?" ──► [buildPubMedQuery] ──► "migraine symptoms" (assert.equal)
 *  "migraine migraine treatment"        ──► [buildPubMedQuery] ──► "migraine treatment" (assert.equal)
 * ============================================================================
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPubMedQuery } = require("../services/pubmedService");

test("reduces conversational questions to useful PubMed terms", () => {
  assert.equal(
    buildPubMedQuery("What are common migraine symptoms?"),
    "migraine symptoms"
  );
});

test("deduplicates repeated search terms", () => {
  assert.equal(buildPubMedQuery("migraine migraine treatment"), "migraine treatment");
});
