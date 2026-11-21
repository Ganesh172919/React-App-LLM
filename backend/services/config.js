// Validates system environment variables, secrets, and security configuration at startup.
// Prevents application boot if database URIs, JWT secrets, or client origins are missing.
// Enforces cryptographic uniqueness, HTTPS production cookies, and OAuth invariants.
const { deploymentProviders } = require("./providerSelection");

const validateConfig = () => {
  // Verify required baseline environment variables and enforce strict presence.
  // Iterates across database connection URI, JWT secrets, and client origin settings.
  // Throws an explicit descriptive error if any fundamental configuration key is omitted.
  const required = ["MONGO_URI", "JWT_ACCESS_TOKEN", "JWT_REFRESH_TOKEN", "JWT_VERIFICATION_TOKEN", "JWT_RESET_TOKEN", "CLIENT_ORIGIN"];
  for (const key of required) if (!process.env[key]) throw new Error(key + " must be configured.");

  // Enforce cryptographic entropy, distinctness, and minimal length on JWT secrets.
  // Rejects insecure placeholders, values under 32 characters, and duplicate secret reuse.
  // Guarantees independent signing keys across access, refresh, reset, and verification tokens.
  const secrets = required.filter((key) => key.startsWith("JWT_")).map((key) => process.env[key]);
  if (secrets.some((secret) => secret.length < 32 || /replace-with/i.test(secret)) || new Set(secrets).size !== secrets.length) throw new Error("JWT secrets must be distinct random values of at least 32 characters.");

  // Validate supported AI provider options and AES-256 credential encryption keys.
  // Restricts AI_PROVIDER to allowed enumerations (gemini, groq, together, local).
  // Mandates exactly 64 hexadecimal characters for USER_API_KEY_ENCRYPTION_KEY.
  if (process.env.AI_PROVIDER && !deploymentProviders.includes(process.env.AI_PROVIDER)) throw new Error("AI_PROVIDER must be one of " + deploymentProviders.join(", ") + ".");
  if (process.env.USER_API_KEY_ENCRYPTION_KEY && !/^[0-9a-f]{64}$/i.test(process.env.USER_API_KEY_ENCRYPTION_KEY)) throw new Error("USER_API_KEY_ENCRYPTION_KEY must be 64 hexadecimal characters.");
  if (process.env.USER_API_KEY_ENCRYPTION_KEY && secrets.includes(process.env.USER_API_KEY_ENCRYPTION_KEY)) throw new Error("USER_API_KEY_ENCRYPTION_KEY must be distinct from JWT secrets.");

  // Validate key ring configurations and secondary Gemini model verification flags.
  // Delegates multi-key ring structure validation to providerCredentials service.
  // Asserts that automated peer review via GEMINI_VERIFY_ANSWERS has a valid GEMINI_API_KEY.
  if (process.env.USER_API_KEY_ENCRYPTION_KEYS || process.env.USER_API_KEY_ENCRYPTION_KEY_VERSION) {
    try { require("./providerCredentials").validateKeyConfiguration(); }
    catch { throw new Error("Personal API-key encryption key ring is invalid."); }
  }
  if (process.env.GEMINI_VERIFY_ANSWERS === "true" && !process.env.GEMINI_API_KEY) throw new Error("GEMINI_VERIFY_ANSWERS requires GEMINI_API_KEY.");

  // Validate client origin formatting and enforce secure cookie transport in production.
  // Parses each comma-delimited origin to guarantee exact origin matches without paths.
  // Mandates COOKIE_SECURE=true when running with HTTPS in production environments.
  for (const origin of process.env.CLIENT_ORIGIN.split(",")) {
    const url = new URL(origin.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.origin !== origin.trim()) throw new Error("CLIENT_ORIGIN must contain exact HTTP(S) origins.");
    if (process.env.NODE_ENV === "production" && url.protocol === "https:" && process.env.COOKIE_SECURE !== "true") throw new Error("HTTPS production requires COOKIE_SECURE=true.");
  }

  // Validate optional Google OAuth configuration and strict callback URL requirements.
  // Ensures client ID, client secret, and callback URL are all simultaneously configured.
  // Rejects invalid callback paths, query fragments, or non-HTTPS production redirects.
  const google = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL"].map((key) => process.env[key]);
  if (google.some(Boolean)) {
    if (!google.every(Boolean)) throw new Error("Google OAuth requires client ID, secret and callback URL.");
    const callback = new URL(google[2]);
    if (callback.username || callback.password || callback.search || callback.hash || callback.pathname !== "/api/auth/google/callback" || !["http:", "https:"].includes(callback.protocol)) throw new Error("Invalid Google OAuth callback URL.");
    if (process.env.NODE_ENV === "production" && callback.protocol !== "https:") throw new Error("Google OAuth requires an HTTPS callback in production.");
  }
};

// Export configuration validation helper for application boot and verification tasks.
// Invoked by server.js during startup before binding HTTP ports or establishing connections.
// Protects the server environment from running with insecure or missing credentials.
module.exports = { validateConfig };
