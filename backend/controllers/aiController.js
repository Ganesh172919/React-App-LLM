const { generateWithGemini } = require("../services/aiService");
const { findRelevantHistory } = require("../services/historySearch");
const { screenPrompt } = require("../services/safetyService");

const GENERAL_SYSTEM_INSTRUCTION = `You are a careful health-assistance chatbot. Be concise and transparent about uncertainty. Do not claim that a statement is medically verified unless cited evidence was supplied. Do not diagnose a user or replace professional care. If symptoms may be urgent, recommend local emergency services. Never invent citations.`;

exports.handleChat = async (req, res) => {
  const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : "";
  const safety = screenPrompt(prompt);

  if (!safety.allowed) {
    return res.status(safety.category === "invalid" ? 400 : 200).json({
      text: safety.message,
      safety,
      verification: { status: "safety_redirect" },
    });
  }

  try {
    const history = await findRelevantHistory({ userId: req.user.id, prompt });
    const emergencyPrefix =
      safety.category === "possible_emergency"
        ? "Start by clearly advising the user to contact local emergency services now. "
        : "";
    const result = await generateWithGemini({
      prompt,
      history,
      systemInstruction: `${emergencyPrefix}${GENERAL_SYSTEM_INSTRUCTION}`,
    });

    return res.status(200).json({
      text: result.text,
      safety,
      retrieval: { historyMessagesUsed: history.length },
      verification: {
        status: "generated",
        provider: "Gemini",
        model: result.model,
        grounded: false,
      },
    });
  } catch (error) {
    console.error("AI service error:", error.message);
    const status = error.code === "AI_NOT_CONFIGURED" ? 503 : 502;
    return res.status(status).json({
      message:
        error.code === "AI_NOT_CONFIGURED"
          ? "AI service is not configured on the server"
          : "AI service is temporarily unavailable",
    });
  }
};
