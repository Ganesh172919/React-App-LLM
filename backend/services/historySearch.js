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

const tokenize = (value) =>
  new Set(
    (value.toLowerCase().match(/[a-z][a-z'-]+/g) || []).filter(
      (token) => token.length > 2 && !STOP_WORDS.has(token)
    )
  );

const relevance = (queryTokens, value) => {
  const valueTokens = tokenize(value);
  if (!queryTokens.size || !valueTokens.size) return 0;
  let overlap = 0;
  queryTokens.forEach((token) => {
    if (valueTokens.has(token)) overlap += 1;
  });
  return overlap / Math.sqrt(queryTokens.size * valueTokens.size);
};

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
