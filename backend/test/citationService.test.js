/**
 * ============================================================================
 * MEDASSIST AI - CITATION SERVICE UNIT TESTS (citationService.test.js)
 * ============================================================================
 * Role:
 *   Validates deterministic citation verification using Node.js built-in test runner.
 *   Tests accurate mapping of supplied sources, detection of out-of-bounds citations,
 *   and distinction between supplied sources vs. actually cited sources.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: CITATION TEST SUITE
 * ----------------------------------------------------------------------------
 * [citationService.test.js]
 *   │
 *   ├── Test 1: Accepts citations that map to supplied sources
 *   │     └── Validates validCitationCount, 0 invalid citations, and grounded: true
 *   │
 *   ├── Test 2: Flags citations outside the supplied source range
 *   │     └── Verifies detection of [4] when sourceCount is 3 (grounded: false)
 *   │
 *   └── Test 3: Distinguishes supplied sources from cited sources
 *         └── Verifies status: "sources_supplied" when text has no citations
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: TEST ASSERTION PIPELINE
 * ----------------------------------------------------------------------------
 *  Test Input ("Claim [1] [2]", sources: 3)
 *        │
 *        ▼
 *  assessCitationGrounding() ──► status: "citation_checked", grounded: true
 *        │
 *        ▼
 *  assert.equal() checks pass
 * ============================================================================
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { assessCitationGrounding } = require("../services/citationService");

test("accepts citations that map to supplied sources", () => {
  const result = assessCitationGrounding("Claim one [1]. Claim two [2].", 3);
  assert.equal(result.status, "citation_checked");
  assert.equal(result.validCitationCount, 2);
  assert.equal(result.invalidCitationCount, 0);
  assert.equal(result.citationCoverage, 66.7);
  assert.equal(result.citationNumbersValid, true);
  assert.equal(result.grounded, false);
});

test("flags citations outside the supplied source range", () => {
  const result = assessCitationGrounding("Unsupported claim [4].", 3);
  assert.equal(result.status, "invalid_citations");
  assert.deepEqual(result.invalidSourceNumbers, [4]);
  assert.equal(result.grounded, false);
});

test("distinguishes supplied sources from cited sources", () => {
  const result = assessCitationGrounding("No numbered citation was included.", 2);
  assert.equal(result.status, "sources_supplied");
  assert.equal(result.validCitationCount, 0);
});

test("supports multi-citations and ranges like [1, 2] and [1-3]", () => {
  const multi = assessCitationGrounding("Evidence shows efficacy [1, 2].", 2);
  assert.equal(multi.status, "citation_checked");
  assert.equal(multi.validCitationCount, 2);
  assert.equal(multi.invalidCitationCount, 0);

  const range = assessCitationGrounding("Comprehensive review [1-3].", 3);
  assert.equal(range.status, "citation_checked");
  assert.equal(range.validCitationCount, 3);
  assert.equal(range.citationCoverage, 100);
});
