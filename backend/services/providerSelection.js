const User = require("../models/userModel");
const ProviderCredential = require("../models/providerCredentialModel");
const { open } = require("./providerCredentials");
const { fail } = require("./validation");

const personalProviders = ["gemini", "groq", "together"];
const deploymentProviders = ["gemini", "groq", "together", "local"];
const choices = ["deployment", ...deploymentProviders.map((name) => "deployment-" + name), ...personalProviders.map((name) => "personal-" + name)];
const configured = (provider) => ({
  gemini: Boolean(process.env.GEMINI_API_KEY),
  groq: Boolean(process.env.GROQ_API_KEY),
  together: Boolean(process.env.TOGETHER_API_KEY && process.env.TOGETHER_MODEL),
  local: Boolean(process.env.LOCAL_AI_BASE_URL && process.env.LOCAL_AI_MODEL),
})[provider] || false;
const modelFor = (provider) => ({
  gemini: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  groq: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  together: process.env.TOGETHER_MODEL,
  local: process.env.LOCAL_AI_MODEL,
})[provider];
const deploymentKey = (provider) => ({ gemini: process.env.GEMINI_API_KEY, groq: process.env.GROQ_API_KEY, together: process.env.TOGETHER_API_KEY, local: process.env.LOCAL_AI_API_KEY })[provider];
const defaultProvider = () => process.env.AI_PROVIDER || "gemini";
const listChoices = (credentials) => {
  const owned = new Set(credentials.map((item) => item.provider));
  return choices.map((id) => {
    const personal = id.startsWith("personal-");
    const provider = id === "deployment" ? defaultProvider() : id.slice(personal ? 9 : 11);
    return { id, provider, source: personal ? "personal" : "deployment", available: personal ? owned.has(provider) && Boolean(process.env.USER_API_KEY_ENCRYPTION_KEY) : configured(provider) };
  });
};
const resolveProviderSelection = async (userId) => {
  const user = await User.findById(userId).select("providerChoice").lean();
  if (!user) throw fail("Account not found.", 404, "NOT_FOUND");
  const choice = user.providerChoice || "deployment";
  if (!choices.includes(choice)) throw fail("Selected AI provider is unavailable.", 503, "AI_NOT_CONFIGURED");
  const personal = choice.startsWith("personal-");
  const provider = choice === "deployment" ? defaultProvider() : choice.slice(personal ? 9 : 11);
  if (!deploymentProviders.includes(provider)) throw fail("Selected AI provider is unavailable.", 503, "AI_NOT_CONFIGURED");
  let apiKey;
  if (personal) {
    const stored = await ProviderCredential.findOne({ userId, provider }).select("+iv +tag +ciphertext").lean();
    if (!stored) throw fail("Your selected API key is missing. Choose another provider in Account.", 503, "AI_NOT_CONFIGURED");
    apiKey = open(stored);
  } else {
    if (!configured(provider)) throw fail("The selected deployment provider is not configured.", 503, "AI_NOT_CONFIGURED");
    apiKey = deploymentKey(provider);
  }
  return { provider, apiKey, model: modelFor(provider), baseUrl: provider === "local" ? process.env.LOCAL_AI_BASE_URL : undefined, source: personal ? "personal" : "deployment" };
};
module.exports = { choices, configured, defaultProvider, listChoices, resolveProviderSelection };
