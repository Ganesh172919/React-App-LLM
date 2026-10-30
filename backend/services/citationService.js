/**
 * ============================================================================
 * MEDASSIST AI - CITATION GROUNDING SERVICE (citationService.js)
 * ============================================================================
 * Role:
 *   Validates numerical citations in generated medical text against the supplied
 *   PubMed source count. Detects phantom/hallucinated citation numbers (e.g. [4]
 *   when only 3 sources were provided), measures source coverage, and outputs
 *   formal verification status codes.
 *
 * Verification Status Codes:
 *   - "ungrounded": No sources supplied and no citations found.
 *   - "sources_supplied": Sources were provided, but the model cited none of them.
 *   - "citation_checked": Model cited valid source numbers within range [1..sourceCount].
 *   - "invalid_citations": Model hallucinated numbers outside the valid range.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: CITATION EXTRACTION & VERIFICATION LOGIC
 * ----------------------------------------------------------------------------
 * [assessCitationGrounding(text, sourceCount)]
 *   │
 *   ├── 1. Extraction of Citation References
 *   │     ├── Scans text using CITATION_PATTERN: /\[(\d+)\]/g
 *   │     ├── Converts captured strings to sorted, unique integers
 *   │     └── Example: "Claim [1] and [2] and [1]" ──► [1, 2]
 *   │
 *   ├── 2. Partitioning into Valid vs. Invalid Sets
 *   │     ├── Valid: cited numbers where 1 <= num <= sourceCount
 *   │     └── Invalid: cited numbers where num < 1 or num > sourceCount
 *   │
 *   ├── 3. Status Determination
 *   │     ├── If invalidCitations.length > 0 ──► "invalid_citations"
 *   │     ├── If validCitations.length > 0   ──► "citation_checked"
 *   │     ├── If sourceCount > 0 & no cites  ──► "sources_supplied"
 *   │     └── Else                           ──► "ungrounded"
 *   │
 *   └── 4. Grounding Metrics Calculation
 *         ├── citationCoverage: (validCitations.length / sourceCount) * 100%
 *         └── grounded: (validCitations > 0 && invalidCitations === 0)
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: CITATION EVALUATION PROCESS
 * ----------------------------------------------------------------------------
 *  [Generated AI Text] + [sourceCount: 3]
 *            │
 *            ▼
 *  RegEx match /\[(\d+)\]/g ──► Unique numbers: e.g. [1, 2, 4]
 *            │
 *            ├──► Valid in [1..3]: [1, 2] (Count: 2)
 *            └──► Invalid (> 3 or < 1): [4] (Count: 1)
 *            │
 *            ▼
 *     (Invalid Count > 0?)
 *            │
 *       ┌────┴──────────────────────────┐
 *       ▼                               ▼
 *     [Yes]                            [No]
 *       │                               │
 *       ▼                               ▼
 *  status: "invalid_citations"     (Valid Count > 0?)
 *  grounded: false                      │
 *                                  ┌────┴────────────┐
 *                                  ▼                 ▼
 *                                [Yes]              [No]
 *                                  │                 │
 *                                  ▼                 ▼
 *                     status: "citation_checked"  status: "sources_supplied"
 *                     grounded: true              grounded: false
 * ============================================================================
 */
const CITATION_PATTERN = /\[(\d+)\]/g;
const MULTI_CITATION_PATTERN = /\[(\d+(?:\s*(?:[-–]|,)\s*\d+)*)\]/g;

/**
 * ----------------------------------------------------------------------------
 * FUNCTION: assessCitationGrounding
 * ----------------------------------------------------------------------------
 * Evaluates inline numerical citations within text against available sources.
 *
 * @param {string} text - The generated response text containing [n] brackets.
 * @param {number} sourceCount - The total number of valid source records supplied.
 * @returns {object} Verification audit object containing status, counts, coverage, and flags.
 *
 * MINDMAP FLOW:
 * [assessCitationGrounding]
 *   ├── Input: text, sourceCount
 *   ├── Citation Extraction: CITATION_PATTERN.matchAll -> Set of unique numbers
 *   ├── Partitioning:
 *   │     ├── validCitations: numbers in range [1..sourceCount]
 *   │     └── invalidCitations: numbers < 1 or > sourceCount
 *   ├── Status Evaluation:
 *   │     ├── invalidCitations > 0 ──► "invalid_citations"
 *   │     ├── validCitations > 0   ──► "citation_checked"
 *   │     ├── sourceCount > 0      ──► "sources_supplied"
 *   │     └── default              ──► "ungrounded"
 *   └── Output: { status, sourceCount, validCitationCount, invalidCitationCount,
 *                 citationCoverage, citedSourceNumbers, invalidSourceNumbers, grounded }
 * ----------------------------------------------------------------------------
 */
const assessCitationGrounding = (text, sourceCount = 0) => {
  const safeSourceCount = Math.max(0, Number(sourceCount) || 0);
  const rawString = String(text || "");
  const extractedNumbers = [];
  for (const match of rawString.matchAll(MULTI_CITATION_PATTERN)) {
    for (const part of match[1].split(",")) {
      const trimmed = part.trim();
      const rangeMatch = trimmed.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);
        if (start <= end && end - start <= 20) {
          for (let i = start; i <= end; i++) extractedNumbers.push(i);
        } else {
          extractedNumbers.push(start, end);
        }
      } else {
        const num = Number(trimmed);
        if (Number.isInteger(num)) extractedNumbers.push(num);
      }
    }
  }
  const citedNumbers = [
    ...new Set(
      extractedNumbers.length
        ? extractedNumbers
        : Array.from(rawString.matchAll(CITATION_PATTERN), (match) => Number(match[1]))
    ),
  ].sort((left, right) => left - right);
  const validCitations = citedNumbers.filter(
    (number) => number >= 1 && number <= safeSourceCount
  );
  const invalidCitations = citedNumbers.filter(
    (number) => number < 1 || number > safeSourceCount
  );

  let status = "ungrounded";
  if (safeSourceCount > 0 && citedNumbers.length === 0) status = "sources_supplied";
  if (safeSourceCount > 0 && validCitations.length > 0) status = "citation_checked";
  if (invalidCitations.length > 0) status = "invalid_citations";

  return {
    status,
    sourceCount: safeSourceCount,
    validCitationCount: validCitations.length,
    invalidCitationCount: invalidCitations.length,
    citationCoverage: safeSourceCount
      ? Number(((validCitations.length / safeSourceCount) * 100).toFixed(1))
      : 0,
    citedSourceNumbers: validCitations,
    invalidSourceNumbers: invalidCitations,
    citationNumbersValid: validCitations.length > 0 && invalidCitations.length === 0,
    grounded: false,
  };
};

module.exports = { assessCitationGrounding };
