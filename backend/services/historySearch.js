/**
 * ============================================================================
 * MEDASSIST AI - RELEVANT HISTORY SEARCH SERVICE (historySearch.js)
 * ============================================================================
 * Role:
 *   Performs privacy-safe, user-scoped relevance ranking over prior conversation
 *   exchanges. Uses tokenization, stop-word elimination, and token-overlap
 *   similarity to supply lightweight conversational context to Gemini without
 *   requiring an external vector database or incurring extra embedding latency.
 *
 * Mathematical Relevance Formulation:
 *   overlap = |queryTokens ∩ valueTokens|
 *   relevance = overlap / sqrt(|queryTokens| * |valueTokens|)
 *
 * Privacy Guarantees:
 *   - Strictly scopes Mongoose query to `userId: req.user.id`.
 *   - Only scans recent 20 chats; returns at most `limit` (default 4) relevant turns.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: CONVERSATION RELEVANCE SCORING
 * ----------------------------------------------------------------------------
 * [findRelevantHistory({ userId, prompt, limit })]
 *   │
 *   ├── 1. Tokenization of Query Prompt (tokenize)
 *   │     ├── Normalizes text to lowercase
 *   │     ├── Extracts alphabetical tokens (length > 2)
 *   │     └── Filters out common English stop words (STOP_WORDS set)
 *   │
 *   ├── 2. User Conversation Loading
 *   │     └── Queries Chat.find({ userId }).sort({ updatedAt: -1 }).limit(20)
 *   │
 *   ├── 3. Overlap Scoring (relevance)
 *   │     ├── Tokenizes prompt + response of each historical exchange
 *   │     └── Computes: overlap / sqrt(|queryTokens| * |valueTokens|)
 *   │
 *   ├── 4. Filtering & Ranking
 *   │     ├── Discards zero-similarity items (score > 0)
 *   │     ├── Sorts descending by relevance score
 *   │     └── Selects top `limit` entries (default 4)
 *   │
 *   └── 5. Gemini Format Transformation
 *         └── Expands to [{ role: "user", text }, { role: "assistant", text }]
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: TOKEN OVERLAP AND RELEVANCE RANKING
 * ----------------------------------------------------------------------------
 *  [User Prompt] ──► tokenize() ──► queryTokens: Set {"migraine", "symptoms"}
 *                                                │
 *  [MongoDB User Chats]                          │
 *    - Message A: "Common migraine symptoms" ────┼─► overlap: 2, score: 0.816
 *    - Message B: "How to format JS date" ───────┼─► overlap: 0, score: 0.000 (dropped)
 *    - Message C: "Severe headache and nausea" ──┼─► overlap: 1, score: 0.354
 *                                                │
 *                                                ▼
 *                                     Sort: [Message A, Message C]
 *                                                │
 *                                                ▼
 *                                   Transform to Gemini History
 * ============================================================================
 */
const Chat = require("../models/chatModel");

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "but",
  "for",
  "from",
  "have",
  "how",
  "that",
  "the",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
  "you",
  "your",
]);

/**
 * ----------------------------------------------------------------------------
 * FUNCTION: tokenize
 * ----------------------------------------------------------------------------
 * Extracts clean, lowercased, alphabetic tokens of length > 2 excluding stop words.
 *
 * @param {string} value - Raw input sentence or document text.
 * @returns {Set<string>} Deduplicated set of significant tokens.
 */
const tokenize = (value) =>
  new Set(
    (value.toLowerCase().match(/[a-z][a-z'-]+/g) || []).filter(
      (token) => token.length > 2 && !STOP_WORDS.has(token)
    )
  );

/**
 * ----------------------------------------------------------------------------
 * FUNCTION: relevance
 * ----------------------------------------------------------------------------
 * Computes cosine-like token overlap relevance between query tokens and document text.
 * Formula: overlap / sqrt(|queryTokens| * |valueTokens|)
 *
 * @param {Set<string>} queryTokens - Pre-tokenized query set.
 * @param {string} value - Document text to compare against.
 * @returns {number} Normalized similarity score between 0.0 and 1.0.
 */
const relevance = (queryTokens, value) => {
  const valueTokens = tokenize(value);
  if (!queryTokens.size || !valueTokens.size) return 0;
  let overlap = 0;
  queryTokens.forEach((token) => {
    if (valueTokens.has(token)) overlap += 1;
  });
  return overlap / Math.sqrt(queryTokens.size * valueTokens.size);
};

/**
 * ----------------------------------------------------------------------------
 * FUNCTION: findRelevantHistory
 * ----------------------------------------------------------------------------
 * Scans the user's recent chats, scores historical exchanges against the query,
 * and formats the top scoring turns for Gemini multi-turn context.
 *
 * @param {object} params - { userId, prompt, limit }
 * @returns {Promise<Array<{role: string, text: string}>>} History turns array.
 * ----------------------------------------------------------------------------
 */
const findRelevantHistory = async ({ userId, prompt, limit = 4 }) => {
  const queryTokens = tokenize(prompt);
  if (!queryTokens.size) return [];

  const chats = await Chat.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(20)
    .select("messages")
    .lean();

  return chats
    .flatMap((chat) => chat.messages || [])
    .map((message) => ({
      score: relevance(queryTokens, `${message.prompt} ${message.response}`),
      prompt: message.prompt,
      response: message.response,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .flatMap((item) => [
      { role: "user", text: item.prompt },
      { role: "assistant", text: item.response },
    ]);
};

module.exports = { findRelevantHistory, relevance, tokenize };
