const validateConfig = () => {
  const required = ["MONGO_URI", "JWT_ACCESS_TOKEN", "JWT_REFRESH_TOKEN", "JWT_VERIFICATION_TOKEN", "JWT_RESET_TOKEN", "CLIENT_ORIGIN"];
  for (const key of required) if (!process.env[key]) throw new Error(key + " must be configured.");
  const secrets = required.filter((key) => key.startsWith("JWT_")).map((key) => process.env[key]);
  if (secrets.some((secret) => secret.length < 32 || /replace-with/i.test(secret)) || new Set(secrets).size !== secrets.length) throw new Error("JWT secrets must be distinct random values of at least 32 characters.");
  if (process.env.AI_PROVIDER && !["gemini", "groq", "together", "local"].includes(process.env.AI_PROVIDER)) throw new Error("AI_PROVIDER must be gemini, groq, together, or local.");
  if (process.env.USER_API_KEY_ENCRYPTION_KEY && !/^[0-9a-f]{64}$/i.test(process.env.USER_API_KEY_ENCRYPTION_KEY)) throw new Error("USER_API_KEY_ENCRYPTION_KEY must be 64 hexadecimal characters.");
  if (process.env.USER_API_KEY_ENCRYPTION_KEY && secrets.includes(process.env.USER_API_KEY_ENCRYPTION_KEY)) throw new Error("USER_API_KEY_ENCRYPTION_KEY must be distinct from JWT secrets.");
  if (process.env.GEMINI_VERIFY_ANSWERS === "true" && !process.env.GEMINI_API_KEY) throw new Error("GEMINI_VERIFY_ANSWERS requires GEMINI_API_KEY.");
  for (const origin of process.env.CLIENT_ORIGIN.split(",")) {
    const url = new URL(origin.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.origin !== origin.trim()) throw new Error("CLIENT_ORIGIN must contain exact HTTP(S) origins.");
    if (process.env.NODE_ENV === "production" && url.protocol === "https:" && process.env.COOKIE_SECURE !== "true") throw new Error("HTTPS production requires COOKIE_SECURE=true.");
  }
  const google = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL"].map((key) => process.env[key]);
  if (google.some(Boolean)) {
    if (!google.every(Boolean)) throw new Error("Google OAuth requires client ID, secret and callback URL.");
    const callback = new URL(google[2]);
    if (callback.username || callback.password || callback.search || callback.hash || callback.pathname !== "/api/auth/google/callback" || !["http:", "https:"].includes(callback.protocol)) throw new Error("Invalid Google OAuth callback URL.");
    if (process.env.NODE_ENV === "production" && callback.protocol !== "https:") throw new Error("Google OAuth requires an HTTPS callback in production.");
  }
};
module.exports = { validateConfig };
