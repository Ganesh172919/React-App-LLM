const { randomUUID, createHash } = require("crypto");
const Chat = require("../models/chatModel");
const Generation = require("../models/generationModel");
const { answer } = require("../services/answerService");
const { id, text, keys, fail } = require("../services/validation");
exports.handleChat = async (req, res, next) => {
  let job; let ownsJob = false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  const abort = () => { if (!res.writableEnded) controller.abort(); };
  res.on("close", abort);
  try {
    keys(req.body, ["prompt", "sessionId", "exchangeId"]);
    const prompt = text(req.body.prompt, "Message", 4000);
    const requestedSession = id(req.body.sessionId, true);
    const exchangeId = req.body.exchangeId ? id(req.body.exchangeId) : randomUUID();
    if (requestedSession && !await Chat.exists({ sessionId: requestedSession, userId: req.user.id })) throw fail("Conversation not found.", 404, "NOT_FOUND");
    const inputHash = createHash("sha256").update(JSON.stringify([prompt, requestedSession, Boolean(req.forceMedical)])).digest("hex");
    try {
      job = await Generation.create({ userId: req.user.id, exchangeId, inputHash, sessionId: requestedSession || randomUUID(), newConversation: !requestedSession });
      ownsJob = true;
    } catch (error) {
      if (error.code !== 11000) throw error;
      job = await Generation.findOne({ userId: req.user.id, exchangeId });
      if (!job || job.inputHash !== inputHash) throw fail("This request ID was already used for another message.", 409, "ID_CONFLICT");
      if (job.state !== "ready") throw fail("This message is still being generated. Please wait before retrying.", 409, "GENERATION_PENDING");
    }
    if (ownsJob) {
      const result = await answer({ prompt, sessionId: requestedSession, userId: req.user.id, signal: controller.signal, services: req.app.locals.services, forceMedical: req.forceMedical });
      if (result.invalid) throw fail(result.text);
      job.result = { ...result, prompt, exchangeId, timestamp: new Date().toISOString() };
      job.state = "ready"; await job.save();
    }
    return res.json({ ...job.result, generationId: job.exchangeId, sessionId: job.sessionId });
  } catch (error) {
    if (ownsJob && job) await Generation.deleteOne({ _id: job._id }).catch(() => {});
    if (!error.status) { error.status = 503; error.code = "AI_UNAVAILABLE"; error.message = controller.signal.aborted ? "The request timed out. Please try again." : "Answer generation is unavailable. Please try again later."; }
    next(error);
  } finally { clearTimeout(timer); res.off("close", abort); }
};
