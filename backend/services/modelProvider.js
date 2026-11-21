// Import Axios HTTP client and provider selection discovery functions.
// Injects generateWithGemini from aiService to handle Google Gemini requests.
// Resolves default system configurations and provider readiness functions.
const axios = require("axios");
const { generateWithGemini } = require("./aiService");
const { configured, defaultProvider, deploymentKey, modelFor, providers } = require("./providerSelection");

// Generates text completions across the configured OpenAI-compatible REST endpoints.
// Constructs chat completion payloads, validates remote HTTPS requirements, and sets bearer auth.
// Validates finish reasons and extracts synthesized answer strings with provider labels.
const generateWithOpenAICompatible = async ({ prompt, systemInstruction, history = [], signal, providerConfig }) => {
  // Resolve base URL, model name, and API key based on the selected provider.
  // Sends hosted-provider requests to their fixed HTTPS endpoints.
  // Throws AI_NOT_CONFIGURED error if required endpoints, models, or credentials are absent.
  const provider = providerConfig?.provider || defaultProvider();
  const local = provider === "local";
  const base = local ? providerConfig?.baseUrl || process.env.LOCAL_AI_BASE_URL : providers[provider]?.endpoint;
  const model = providerConfig?.model || modelFor(provider);
  const apiKey = providerConfig?.apiKey || deploymentKey(provider);
  if (!base || !model || (!local && !apiKey)) {
    const error = new Error("The selected AI provider is not configured."); error.code = "AI_NOT_CONFIGURED"; throw error;
  }
  // Validate endpoint URL structure and enforce strict HTTPS for all remote connections.
  // Prohibits embedded credentials, fragments, queries, or unsupported protocols in base URL.
  // Restricts non-HTTPS endpoints strictly to local loopback hosts (localhost, 127.0.0.1, [::1]).
  const url = new URL(base);
  if (url.username || url.password || url.search || url.hash || !["http:", "https:"].includes(url.protocol)) throw new Error("Invalid local AI endpoint.");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Remote AI endpoints must use HTTPS.");
  // Format message payload containing system instructions, truncated history, and prompt.
  // Dispatches HTTP POST to /chat/completions with temperature 0.25 and 30-second timeout.
  // Parses response choices and asserts finish_reason is "stop" to guarantee answer completeness.
  const messages = [{ role: "system", content: systemInstruction }, ...history.filter((item) => item?.text).slice(-8).map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: item.text.slice(0, 2000) })), { role: "user", content: prompt }];
  const tokenLimit = provider === "groq" && model.startsWith("openai/gpt-oss-")
    ? { max_completion_tokens: 1600, reasoning_effort: "low", include_reasoning: false }
    : { max_tokens: 900 };
  const body = { model, messages, temperature: 0.25, ...tokenLimit };
  const response = await axios.post(url.toString().replace(/\/$/, "") + "/chat/completions", body, { timeout: 30000, signal, maxRedirects: 0, maxContentLength: 1024 * 1024, headers: { "Content-Type": "application/json", ...(apiKey ? { Authorization: "Bearer " + apiKey } : {}) } });
  const choice = response.data?.choices?.[0];
  const text = typeof choice?.message?.content === "string" ? choice.message.content.trim() : "";
  if (choice?.finish_reason !== "stop" || !text) { const error = new Error("The AI provider did not complete the answer."); error.code = "AI_INCOMPLETE_RESPONSE"; throw error; }
  const servedModel = typeof response.data?.model === "string" ? response.data.model : model;
  return { text, model: servedModel, provider: providers[provider].label };
};

// Dispatcher routing text generation requests to the appropriate provider driver.
// Dispatches Gemini separately from providers that use OpenAI-compatible chat completions.
// Throws AI_NOT_CONFIGURED if an unsupported or unrecognized provider is requested.
const generateAnswer = (args) => {
  const provider = args.providerConfig?.provider || defaultProvider();
  if (provider === "gemini") return generateWithGemini(args);
  if (Object.hasOwn(providers, provider)) return generateWithOpenAICompatible(args);
  const error = new Error("Unsupported AI_PROVIDER."); error.code = "AI_NOT_CONFIGURED"; throw error;
};

// Inspects deployment configuration to confirm default AI provider readiness.
// Evaluates whether the operator-configured default provider has all required keys.
// Consumed by /api/ready health probes to determine system uptime and readiness state.
const providerConfigured = () => configured(defaultProvider());

// Export model generation dispatcher and provider verification helper functions.
// Provides unified AI interface consumed by answerService for clinical text synthesis.
// Exposes OpenAI-compatible driver directly for isolated testing and benchmark suites.
module.exports = { generateAnswer, generateWithOpenAICompatible, providerConfigured };
