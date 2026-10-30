const Chat = require("../models/chatModel");
const STOP_WORDS = new Set("about after also and are but for from have how that the this what when where which with you your of".split(" "));
const tokenize = (value) => new Set((String(value || "").toLowerCase().match(/[a-z][a-z'-]+/g) || []).filter((word) => word.length > 2 && !STOP_WORDS.has(word)));
const relevance = (queryTokens, value) => {
  const tokens = tokenize(value); if (!queryTokens.size || !tokens.size) return 0;
  return [...queryTokens].filter((word) => tokens.has(word)).length / Math.sqrt(queryTokens.size * tokens.size);
};
const safeExchange = (item) => item && !item.isMedical && item.verification?.status !== "safety_redirect" && typeof item.prompt === "string" && typeof item.response === "string";
const findRelevantHistory = async ({ userId, prompt, sessionId, usePastChats = false }) => {
  const current = sessionId ? await Chat.findOne({ userId, sessionId }, { messages: { $slice: -4 } }).lean() : null;
  const recent = (current?.messages || []).filter(safeExchange).slice(-3);
  let related = [];
  if (usePastChats) {
    const queryTokens = tokenize(prompt);
    if (queryTokens.size) {
      const filter = { userId, ...(sessionId ? { sessionId: { $ne: sessionId } } : {}) };
      const chats = await Chat.find(filter, { messages: { $slice: -6 } }).sort({ updatedAt: -1 }).limit(24).lean();
      related = chats.flatMap((chat) => (chat.messages || []).filter(safeExchange).map((item) => ({ item, score: relevance(queryTokens, item.prompt), time: new Date(item.timestamp || chat.updatedAt).getTime() })))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || b.time - a.time)
        .slice(0, 2).sort((a, b) => a.time - b.time)
        .map(({ item }) => item);
    }
  }
  return [...related, ...recent].flatMap((item) => [
    { role: "user", text: item.prompt.slice(0, 2000) }, { role: "assistant", text: item.response.slice(0, 2000) },
  ]);
};
module.exports = { findRelevantHistory, relevance, tokenize };
