const Chat = require("../models/chatModel");
const Generation = require("../models/generationModel");
const { id, text, keys, fail } = require("../services/validation");
const escapeRegex = (value) => value.replace(/[.*+?^\x24{}()|[\]\\]/g, "\\$&");
const makeConversationTitle = (prompt) => String(prompt || "")
  .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/https?:\/\/\S+/gi, " ")
  .replace(/\s+/g, " ").trim().slice(0, 60).trim() || "New conversation";
const summary = (chat) => ({ id: chat.sessionId, sessionId: chat.sessionId, title: chat.title, isMedical: chat.isMedical, isPinned: Boolean(chat.isPinned), timestamp: chat.updatedAt, createdAt: chat.createdAt });
const format = (chat) => ({ ...summary(chat), messages: chat.messages.flatMap((msg, index) => [
  { id: (msg.exchangeId || index) + "-user", text: msg.prompt, isUser: true, timestamp: msg.timestamp, isMedical: msg.isMedical },
  { id: (msg.exchangeId || index) + "-assistant", text: msg.response, isUser: false, timestamp: msg.timestamp, isMedical: msg.isMedical, references: msg.references, verification: msg.verification },
]) });
exports.saveChat = async (req, res, next) => {
  try {
    keys(req.body, ["generationId"]); const generationId = id(req.body.generationId);
    const job = await Generation.findOne({ userId: req.user.id, exchangeId: generationId, state: "ready", expiresAt: { $gt: new Date() } }).lean();
    if (!job) throw fail("Saved answer token not found or expired. Please send the message again.", 404, "NOT_FOUND");
    const result = job.result;
    const message = { exchangeId: job.exchangeId, prompt: result.prompt, response: result.text, isMedical: result.isMedical, references: result.references, verification: result.verification, timestamp: result.timestamp };
    if (job.newConversation) {
      try { await Chat.updateOne({ sessionId: job.sessionId, userId: req.user.id }, { $setOnInsert: { title: makeConversationTitle(result.prompt), messages: [], createdAt: new Date(), updatedAt: new Date(), isMedical: false } }, { upsert: true }); }
      catch (error) { if (error.code !== 11000) throw error; }
    }
    const bytes = Buffer.byteLength(JSON.stringify(message)) + 1024;
    const chat = await Chat.findOneAndUpdate({
      sessionId: job.sessionId, userId: req.user.id, "messages.exchangeId": { $ne: job.exchangeId },
      $expr: { $and: [{ $lt: [{ $size: "$messages" }, 1000] }, { $lt: [{ $add: [{ $bsonSize: "$$ROOT" }, bytes] }, 12 * 1024 * 1024] }] },
    }, { $push: { messages: message }, $set: { updatedAt: new Date(), ...(result.isMedical ? { isMedical: true } : {}) } }, { new: true, runValidators: true }).lean();
    if (!chat) {
      const existing = await Chat.findOne({ sessionId: job.sessionId, userId: req.user.id }).lean();
      if (!existing) throw fail("Conversation no longer exists.", 404, "NOT_FOUND");
      if (!existing.messages.some((item) => item.exchangeId === job.exchangeId)) throw fail("Conversation limit reached. Start a new conversation.", 409, "CHAT_LIMIT");
      return res.json({ sessionId: job.sessionId, isNew: job.newConversation, chat: format(existing), replayed: true });
    }
    req.app.locals.broadcastUpdate?.({ action: "SAVED", sessionId: chat.sessionId, summary: summary(chat) }, req.user.id);
    return res.status(201).json({ sessionId: chat.sessionId, isNew: job.newConversation, chat: format(chat) });
  } catch (error) { next(error); }
};
exports.getHistory = async (req, res, next) => {
  try {
    const limit = req.query.limit === undefined ? 30 : Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (req.query.q !== undefined && (typeof req.query.q !== "string" || req.query.q.length > 80))) throw fail("Invalid history parameters.");
    const filter = { userId: req.user.id };
    if (req.query.q?.trim()) { const re = new RegExp(escapeRegex(req.query.q.trim()), "i"); filter.$or = [{ title: re }, { "messages.prompt": re }]; }
    if (req.query.cursor) {
      let cursor; try { cursor = JSON.parse(Buffer.from(String(req.query.cursor), "base64url").toString()); } catch { throw fail("Invalid history cursor."); }
      id(cursor.id); const date = new Date(cursor.date); if (!Number.isFinite(date.getTime())) throw fail("Invalid history cursor.");
      filter.$and = [{ $or: [{ updatedAt: { $lt: date } }, { updatedAt: date, sessionId: { $lt: cursor.id } }] }];
    }
    const chats = await Chat.find(filter).sort({ updatedAt: -1, sessionId: -1 }).select("-messages").limit(limit + 1).lean();
    const hasMore = chats.length > limit; const items = chats.slice(0, limit); const last = items.at(-1);
    return res.json({ items: items.map(summary), nextCursor: hasMore ? Buffer.from(JSON.stringify({ date: last.updatedAt, id: last.sessionId })).toString("base64url") : null });
  } catch (error) { next(error); }
};
exports.getChat = async (req, res, next) => {
  try { const chat = await Chat.findOne({ sessionId: id(req.params.sessionId), userId: req.user.id }).lean(); if (!chat) throw fail("Conversation not found.", 404, "NOT_FOUND"); res.json(format(chat)); } catch (error) { next(error); }
};
exports.updateChat = async (req, res, next) => {
  try {
    keys(req.body, ["title", "isPinned"]); const sessionId = id(req.params.sessionId);
    const update = {};
    if (req.body.title !== undefined) { update.title = text(req.body.title, "Title", 80); update.updatedAt = new Date(); }
    if (req.body.isPinned !== undefined) {
      if (typeof req.body.isPinned !== "boolean") throw fail("isPinned must be a boolean.");
      update.isPinned = req.body.isPinned;
    }
    if (!Object.keys(update).length) throw fail("Choose a field to update.");
    const chat = await Chat.findOneAndUpdate({ sessionId, userId: req.user.id }, { $set: update }, { new: true }).lean();
    if (!chat) throw fail("Conversation not found.", 404, "NOT_FOUND");
    req.app.locals.broadcastUpdate?.({ action: update.isPinned !== undefined ? "PIN" : "RENAME", sessionId, summary: summary(chat) }, req.user.id);
    res.json(summary(chat));
  } catch (error) { next(error); }
};
exports.deleteChat = async (req, res, next) => {
  try {
    const sessionId = id(req.params.sessionId || req.body.sessionId);
    const chat = await Chat.findOneAndDelete({ sessionId, userId: req.user.id });
    if (!chat) throw fail("Conversation not found.", 404, "NOT_FOUND");
    await Generation.deleteMany({ sessionId, userId: req.user.id });
    req.app.locals.broadcastUpdate?.({ action: "DELETE", sessionId }, req.user.id); res.json({ success: true, message: "Conversation deleted." });
  } catch (error) { next(error); }
};
exports.deleteAllChats = async (req, res, next) => {
  try {
    await Chat.deleteMany({ userId: req.user.id });
    await Generation.deleteMany({ userId: req.user.id });
    req.app.locals.broadcastUpdate?.({ action: "CLEAR_ALL" }, req.user.id);
    res.json({ success: true, message: "All conversations deleted." });
  } catch (error) { next(error); }
};
module.exports.format = format;
module.exports.makeConversationTitle = makeConversationTitle;
