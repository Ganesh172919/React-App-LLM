const axios = require("axios");
const { generateWithGemini } = require("./aiService");
const { configured, defaultProvider } = require("./providerSelection");

// Endpoints are operator configuration, never supplied by a chat request.
const generateWithOpenAICompatible = async ({ prompt, systemInstruction, history = [], signal, providerConfig }) => {
  const provider = providerConfig?.provider || defaultProvider();
  const isTogether = provider === "together";
  const isGroq = provider === "groq";
  const base = isTogether ? "https://api.together.xyz/v1" : isGroq ? "https://api.groq.com/openai/v1" : providerConfig?.baseUrl || process.env.LOCAL_AI_BASE_URL;
  const model = providerConfig?.model || (isTogether ? process.env.TOGETHER_MODEL : isGroq ? process.env.GROQ_MODEL || "openai/gpt-oss-20b" : process.env.LOCAL_AI_MODEL);
  const apiKey = providerConfig?.apiKey || (isTogether ? process.env.TOGETHER_API_KEY : isGroq ? process.env.GROQ_API_KEY : process.env.LOCAL_AI_API_KEY);
  if (!base || !model || ((isTogether || isGroq) && !apiKey)) {
    const error = new Error("The selected AI provider is not configured."); error.code = "AI_NOT_CONFIGURED"; throw error;
  }
  const url = new URL(base);
  if (url.username || url.password || url.search || url.hash || !["http:", "https:"].includes(url.protocol)) throw new Error("Invalid local AI endpoint.");
  if (!isTogether && !isGroq && url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Remote AI endpoints must use HTTPS.");
  const messages = [{ role: "system", content: systemInstruction }, ...history.filter((item) => item?.text).slice(-8).map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: item.text.slice(0, 2000) })), { role: "user", content: prompt }];
  const response = await axios.post(url.toString().replace(/\/$/, "") + "/chat/completions", { model, messages, temperature: 0.25, max_tokens: 900 }, { timeout: 30000, signal, maxRedirects: 0, maxContentLength: 1024 * 1024, headers: { "Content-Type": "application/json", ...(apiKey ? { Authorization: "Bearer " + apiKey } : {}) } });
  const choice = response.data?.choices?.[0];
  const text = typeof choice?.message?.content === "string" ? choice.message.content.trim() : "";
  if (choice?.finish_reason !== "stop" || !text) { const error = new Error("The AI provider did not complete the answer."); error.code = "AI_INCOMPLETE_RESPONSE"; throw error; }
  return { text, model, provider: isTogether ? "Together AI" : isGroq ? "Groq" : "Local/OpenAI-compatible" };
};

const generateAnswer = (args) => {
  const provider = args.providerConfig?.provider || defaultProvider();
  if (provider === "gemini") return generateWithGemini(args);
  if (["groq", "together", "local"].includes(provider)) return generateWithOpenAICompatible(args);
  const error = new Error("Unsupported AI_PROVIDER."); error.code = "AI_NOT_CONFIGURED"; throw error;
};
const providerConfigured = () => configured(defaultProvider());
module.exports = { generateAnswer, generateWithOpenAICompatible, providerConfigured };
