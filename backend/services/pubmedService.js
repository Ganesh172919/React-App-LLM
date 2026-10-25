/**
 * ============================================================================
 * MEDASSIST AI - PUBMED QUERY NORMALIZATION SERVICE (pubmedService.js)
 * ============================================================================
 * Role:
 *   Extracts salient clinical entities and medical search keywords from user
 *   conversational questions to query PubMed / NCBI databases efficiently.
 *
 * Key Capabilities:
 *   - Conversational Noise Stripping: Discards interrogative pronouns, auxiliary
 *     verbs, and common stopwords (e.g. "what", "how", "does", "common").
 *   - Token Sanitation: Extracts alphanumeric terms with hyphens (e.g. "covid-19").
 *   - Deduplication: Retains unique terms maintaining semantic precision.
 *   - Query Truncation: Caps maximum clinical terms at 12 to respect NCBI E-utilities
 *     URL limits and avoid query dilution.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: PUBMED QUERY TOKENIZATION & FILTERING
 * ----------------------------------------------------------------------------
 * [Raw User Prompt (e.g., "What are common migraine symptoms?")]
 *        │
 *        ├── 1. String Coercion & Lowercasing (String(prompt).toLowerCase())
 *        ├── 2. Regex Tokenization (/[a-z][a-z0-9-]+/g)
 *        ├── 3. Length & Stopword Filtering (len > 2 && !QUERY_STOP_WORDS.has(term))
 *        ├── 4. Set Deduplication ([...new Set(clinicalTerms)])
 *        ├── 5. Slice & Join (slice(0, 12).join(" ") -> "migraine symptoms")
 *        └── 6. Fallback (reverts to trimmed prompt if no tokens survive)
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: QUERY REDUCTION PIPELINE
 * ----------------------------------------------------------------------------
 *  "What are common migraine symptoms?"
 *        │
 *        ▼ Regex Match: ["what", "are", "common", "migraine", "symptoms"]
 *  ┌────────────────────────────────────────────────────────────────────────┐
 *  │ Stopword Gate:                                                         │
 *  │ "what"     -> STOPWORD (discarded)                                     │
 *  │ "are"      -> STOPWORD (discarded)                                     │
 *  │ "common"   -> STOPWORD (discarded)                                     │
 *  │ "migraine" -> KEPT                                                     │
 *  │ "symptoms" -> KEPT                                                     │
 *  └────────────────────────────────────────────────────────────────────────┘
 *        │
 *        ▼ Deduplicate & Truncate (max 12 tokens)
 *  "migraine symptoms" (PubMed Search Input)
 * ============================================================================
 */
const QUERY_STOP_WORDS = new Set([
  "about",
  "are",
  "can",
  "common",
  "could",
  "does",
  "for",
  "from",
  "have",
  "how",
  "information",
  "is",
  "should",
  "the",
  "their",
  "these",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
]);

/**
 * Reduce conversational medical questions to clean, deduplicated search terms for PubMed.
 *
 * Mindmap Flow:
 * ```
 * [buildPubMedQuery]
 *        │
 *        ├── 1. Regex Token Extraction (/[a-z][a-z0-9-]+/g)
 *        ├── 2. Stopword Exclusion (QUERY_STOP_WORDS)
 *        ├── 3. Set Deduplication
 *        └── 4. Top 12 Terms Assembly
 * ```
 *
 * @param {string} prompt Raw user query.
 * @returns {string} Clean PubMed search query string.
 */
const buildPubMedQuery = (prompt) => {
  const tokens = String(prompt || "")
    .toLowerCase()
    .match(/[a-z][a-z0-9-]+/g) || [];
  const clinicalTerms = tokens.filter(
    (token) => token.length > 2 && !QUERY_STOP_WORDS.has(token)
  );
  return [...new Set(clinicalTerms)].slice(0, 12).join(" ") || String(prompt || "").trim();
};

module.exports = { buildPubMedQuery };
