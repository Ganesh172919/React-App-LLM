const fs = require("fs/promises");
const path = require("path");
const Chat = require("../models/chatModel");

const DATASET_REPORT = path.resolve(
  __dirname,
  "../../Model and Dataset/reports/dataset_analysis.json"
);

const toDateKey = (value) => new Date(value).toISOString().slice(0, 10);

const readDatasetSummary = async () => {
  try {
    const report = JSON.parse(await fs.readFile(DATASET_REPORT, "utf8"));
    return {
      rows: report.rows,
      qualityFlags: report.quality_flags,
      questionTypes: report.question_types,
      generatedAt: report.generated_at_utc,
    };
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Unable to read dataset analysis:", error.message);
    }
    return null;
  }
};

exports.getOverview = async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .select("messages isMedical createdAt updatedAt")
      .lean();

    const now = new Date();
    const trend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setUTCDate(now.getUTCDate() - (6 - index));
      return { date: toDateKey(date), sessions: 0, messages: 0 };
    });
    const trendByDate = new Map(trend.map((item) => [item.date, item]));

    let totalMessages = 0;
    let medicalResponses = 0;
    let citedResponses = 0;
    let citations = 0;

    chats.forEach((chat) => {
      const messages = chat.messages || [];
      totalMessages += messages.length;
      messages.forEach((message) => {
        if (message.isMedical) medicalResponses += 1;
        if (message.references?.length) citedResponses += 1;
        citations += message.references?.length || 0;
      });

      const point = trendByDate.get(toDateKey(chat.updatedAt || chat.createdAt));
      if (point) {
        point.sessions += 1;
        point.messages += messages.length;
      }
    });

    const medicalSessions = chats.filter((chat) => chat.isMedical).length;
    const dataset = await readDatasetSummary();

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      summary: {
        totalSessions: chats.length,
        totalMessages,
        medicalSessions,
        medicalResponses,
        citedResponses,
        citations,
        averageMessagesPerSession: chats.length
          ? Number((totalMessages / chats.length).toFixed(1))
          : 0,
      },
      breakdown: [
        { label: "Medical", value: medicalSessions },
        { label: "General", value: chats.length - medicalSessions },
      ],
      trend,
      dataset,
    });
  } catch (error) {
    console.error("Analytics error:", error.message);
    return res.status(500).json({ message: "Unable to load analytics" });
  }
};
