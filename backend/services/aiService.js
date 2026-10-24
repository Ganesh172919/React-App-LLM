const axios = require("axios");

const GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

const extractText = (payload) =>
  payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("\n")
    .trim();

const generateWithGemini = async ({ prompt, systemInstruction, history = [] }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const contents = history
    .filter((item) => item?.text)
    .slice(-8)
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text.slice(0, 2000) }],
    }));

  contents.push({ role: "user", parts: [{ text: prompt }] });

  const response = await axios.post(
    `${GEMINI_API_ROOT}/${encodeURIComponent(model)}:generateContent`,
    {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        temperature: 0.25,
        topP: 0.9,
        maxOutputTokens: 900,
      },
    },
    {
      timeout: 20000,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
    }
  );

  const text = extractText(response.data);
  if (!text) {
    const error = new Error("The AI provider returned an empty response");
    error.code = "AI_EMPTY_RESPONSE";
    throw error;
  }

  return { text, model };
};

module.exports = { generateWithGemini };
