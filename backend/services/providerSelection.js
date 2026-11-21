// Import database models, credential cryptosystem functions, and error helpers.
// Loads User and ProviderCredential schemas for resolving user provider preferences.
// Connects key unsealing and automatic key re-encryption routines on rotation.
const User = require("../models/userModel");
const ProviderCredential = require("../models/providerCredentialModel");
const { openWithMetadata, seal } = require("./providerCredentials");
const { fail } = require("./validation");

// Constant arrays and environment inspection helpers defining supported AI providers.
// Maps personal and deployment provider IDs (Gemini, Groq, Together AI, Local AI).
// Detects whether deployment environment variables and default models are configured.
const personalProviders = ["gemini", "groq", "together"];
const providers = {
  gemini: { label: "Gemini", key: "GEMINI_API_KEY", model: "GEMINI_MODEL", defaultModel: "gemini-3.5-flash-lite" },
  groq: { label: "Groq", key: "GROQ_API_KEY", model: "GROQ_MODEL", defaultModel: "openai/gpt-oss-20b", endpoint: "https://api.groq.com/openai/v1" },
  together: { label: "Together AI", key: "TOGETHER_API_KEY", model: "TOGETHER_MODEL", endpoint: "https://api.together.xyz/v1" },
  local: { label: "Local/OpenAI-compatible", key: "LOCAL_AI_API_KEY", model: "LOCAL_AI_MODEL" },
  openrouter: { label: "OpenRouter", key: "OPENROUTER_API_KEY", model: "OPENROUTER_MODEL", defaultModel: "openrouter/free", endpoint: "https://openrouter.ai/api/v1" },
  xai: { label: "xAI", key: "XAI_API_KEY", model: "XAI_MODEL", endpoint: "https://api.x.ai/v1" },
  fireworks: { label: "Fireworks AI", key: "FIREWORKS_API_KEY", model: "FIREWORKS_MODEL", endpoint: "https://api.fireworks.ai/inference/v1" },
};
const deploymentProviders = Object.keys(providers);
const choices = ["deployment", ...deploymentProviders.map((name) => "deployment-" + name), ...personalProviders.map((name) => "personal-" + name)];
// Checks whether a specific backend deployment provider has necessary environment variables.
// Evaluates API key presence and required model name configuration per provider.
// Returns boolean indicating provider readiness for deployment-level model routing.
const configured = (provider) => Boolean(modelFor(provider) && (
  provider === "local" ? process.env.LOCAL_AI_BASE_URL : deploymentKey(provider)
));

// Resolves default model identifier configured for a specific AI provider.
// Returns model name from environment variables with sensible defaults for Gemini and Groq.
// Guarantees consistent model identification across disparate inference endpoints.
const modelFor = (provider) => {
  if (!Object.hasOwn(providers, provider)) return undefined;
  const { model, defaultModel } = providers[provider];
  return process.env[model] || defaultModel;
};

// Retrieves deployment-level secret API key for a specified inference provider.
// Extracts key material from process environment variables based on provider name.
// Returns undefined if provider is not configured or operates without authentication.
const deploymentKey = (provider) => Object.hasOwn(providers, provider) ? process.env[providers[provider].key] : undefined;

// Identifies primary fallback AI provider configured for global system deployment.
// Reads AI_PROVIDER from environment and defaults to gemini when unspecified.
// Ensures uniform default routing across chat and clinical explanation controllers.
const defaultProvider = () => process.env.AI_PROVIDER || "gemini";

// Formats available provider options for client settings and dashboard displays.
// Compares user's stored personal credentials with system-wide deployment providers.
// Determines whether each provider option is selectable and ready for generation.
const listChoices = (credentials) => {
  const owned = new Set(credentials.map((item) => item.provider));
  return choices.map((id) => {
    const personal = id.startsWith("personal-");
    const provider = id === "deployment" ? defaultProvider() : id.slice(personal ? 9 : 11);
    return { id, provider, source: personal ? "personal" : "deployment", available: personal ? owned.has(provider) && Boolean(process.env.USER_API_KEY_ENCRYPTION_KEY || process.env.USER_API_KEY_ENCRYPTION_KEYS) : configured(provider) };
  });
};

// Resolves runtime provider configurations and decrypts required API credentials.
// Evaluates personal vs deployment provider choice and decrypts ciphertext with AES-256.
// Re-seals credentials under new key versions automatically if rotation is triggered.
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
    const revealed = openWithMetadata(stored);
    apiKey = revealed.apiKey;
    if (revealed.requiresRotation) {
      await ProviderCredential.updateOne({ _id: stored._id, userId, provider }, { $set: seal(apiKey) });
    }
  } else {
    if (!configured(provider)) throw fail("The selected deployment provider is not configured.", 503, "AI_NOT_CONFIGURED");
    apiKey = deploymentKey(provider);
  }
  return { provider, apiKey, model: modelFor(provider), baseUrl: provider === "local" ? process.env.LOCAL_AI_BASE_URL : undefined, source: personal ? "personal" : "deployment" };
};

// Export provider configuration helpers, default providers, and resolution functions.
// Consumed by answerService, settingsController, and server readiness probes.
// Centralizes AI provider routing, API key lookup, and credential lifecycle management.
module.exports = { choices, configured, defaultProvider, deploymentKey, deploymentProviders, listChoices, modelFor, providers, resolveProviderSelection };
