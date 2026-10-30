const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const Chat = require("../models/chatModel");
const { fail } = require("../services/validation");
let cache = { key: null, value: null };
async function readDatasetSummary() {
  const dir = process.env.DATASET_REPORT_DIR || path.resolve(__dirname, "../../Model and Dataset/reports");
  try {
    const paths = ["dataset_analysis.json", "dataset_audit.json"].map((name) => path.join(dir, name));
    const stats = await Promise.all(paths.map((file) => fs.stat(file)));
    const key = paths.join("|") + stats.map((stat) => stat.mtimeMs + ":" + stat.size).join("|");
    if (cache.key === key) return cache.value;
    const [report, audit] = await Promise.all(paths.map(async (file) => JSON.parse(await fs.readFile(file, "utf8"))));
    if (!report.rows || !Number.isFinite(report.rows.total)) return null;
    const value = { rows: report.rows, qualityFlags: report.quality_flags, qualityRates: report.quality_rates_percent, answerLengthDistribution: report.answer_length_distribution, questionTypes: report.question_types, generatedAt: report.generated_at_utc, sourceHash: audit.source_sha256 || report.source_sha256 || null, audit: { multipleAnswerQuestions: audit.multiple_answer_questions, contentFlags: audit.content_flags } };
    cache = { key, value }; return value;
  } catch { return null; }
}
exports.getOverview = async (req, res, next) => {
  try {
    const days = req.query.days === undefined ? 7 : Number(req.query.days);
    if (![7, 30, 90].includes(days)) throw fail("Choose 7, 30, or 90 days.");
    const start = new Date(); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - days + 1);
    const owner = new mongoose.Types.ObjectId(req.user.id);
    const [group] = await Chat.aggregate([
      { $match: { userId: owner } },
      { $facet: {
        sessions: [{ $group: { _id: null, total: { $sum: 1 }, medical: { $sum: { $cond: ["$isMedical", 1, 0] } } } }],
        messages: [{ $unwind: "$messages" }, { $group: { _id: null, total: { $sum: 1 }, medical: { $sum: { $cond: ["$messages.isMedical", 1, 0] } }, cited: { $sum: { $cond: [{ $and: ["$messages.isMedical", { $gt: [{ $size: { $ifNull: ["$messages.references", []] } }, 0] }] }, 1, 0] } }, citations: { $sum: { $size: { $ifNull: ["$messages.references", []] } } } } }],
        statuses: [{ $unwind: "$messages" }, { $group: { _id: { $ifNull: ["$messages.verification.status", "not_recorded"] }, count: { $sum: 1 } } }],
        providers: [{ $unwind: "$messages" }, { $match: { "messages.verification.provider": { $type: "string" } } }, { $group: { _id: "$messages.verification.provider", count: { $sum: 1 } } }],
        sessionTrend: [{ $match: { createdAt: { $gte: start } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", onNull: null } }, count: { $sum: 1 } } }],
        messageTrend: [{ $unwind: "$messages" }, { $match: { "messages.timestamp": { $gte: start } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$messages.timestamp", onNull: null } }, count: { $sum: 1 } } }],
      } },
    ]);
    const sessions = group.sessions[0] || {}; const messages = group.messages[0] || {};
    const sessionMap = new Map(group.sessionTrend.map((item) => [item._id, item.count])); const messageMap = new Map(group.messageTrend.map((item) => [item._id, item.count]));
    const trend = Array.from({ length: days }, (_, index) => { const date = new Date(start); date.setUTCDate(date.getUTCDate() + index); const key = date.toISOString().slice(0, 10); return { date: key, sessions: sessionMap.get(key) || 0, exchanges: messageMap.get(key) || 0 }; });
    const rate = messages.medical ? Number((100 * (messages.cited || 0) / messages.medical).toFixed(1)) : 0;
    res.json({
      generatedAt: new Date().toISOString(), rangeDays: days, summaryScope: "lifetime", timezone: "UTC",
      summary: { totalSessions: sessions.total || 0, totalMessages: messages.total || 0, medicalSessions: sessions.medical || 0, medicalResponses: messages.medical || 0, citedResponses: messages.cited || 0, citations: messages.citations || 0, averageMessagesPerSession: sessions.total ? Number((messages.total / sessions.total).toFixed(1)) || 0 : 0, sourceAttachmentRate: rate },
      breakdown: [{ label: "Medical", value: sessions.medical || 0 }, { label: "General", value: (sessions.total || 0) - (sessions.medical || 0) }],
      trend, verification: { statuses: Object.fromEntries(group.statuses.map((item) => [item._id, item.count])), providers: Object.fromEntries(group.providers.map((item) => [item._id, item.count])) },
      dataset: await readDatasetSummary(),
    });
  } catch (error) { next(error); }
};
exports.readDatasetSummary = readDatasetSummary;
