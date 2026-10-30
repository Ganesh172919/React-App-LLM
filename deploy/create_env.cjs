// Create a local deployment template with independent cryptographic secrets. Never prints secrets.
const fs = require("fs"); const path = require("path"); const { randomBytes } = require("crypto");
const output = path.resolve(__dirname, "../.env");
if (fs.existsSync(output)) throw new Error(".env already exists; keep existing deployment configuration.");
const values = {};
for (const key of ["MONGO_ROOT_PASSWORD", "MONGO_APP_PASSWORD", "JWT_ACCESS_TOKEN", "JWT_REFRESH_TOKEN", "JWT_VERIFICATION_TOKEN", "JWT_RESET_TOKEN", "USER_API_KEY_ENCRYPTION_KEY"]) values[key] = randomBytes(32).toString("hex");
Object.assign(values, { PUBLIC_ORIGIN: "http://localhost:8080", COOKIE_SECURE: "false", AI_PROVIDER: "gemini", GEMINI_API_KEY: "", GEMINI_MODEL: "gemini-2.5-flash", GROQ_API_KEY: "", GROQ_MODEL: "openai/gpt-oss-20b", TOGETHER_API_KEY: "", TOGETHER_MODEL: "", BREVO_API_KEY: "", EMAIL_FROM_ADDRESS: "no-reply@example.com", EMAIL_FROM_NAME: "MedAssist AI" });
fs.writeFileSync(output, Object.entries(values).map(([key, value]) => key + "=" + value).join("\n") + "\n", { mode: 0o600 });
console.log("Created ignored .env with random secrets. Configure email, optional AI, and HTTPS settings before deployment.");
