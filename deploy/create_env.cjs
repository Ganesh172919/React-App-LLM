// Create a local deployment template with independent cryptographic secrets. Never prints secrets.
// Import standard filesystem, path resolution, and cryptographic random byte modules.
// Resolve target environment file path pointing to repository root directory.
const fs = require("fs"); const path = require("path"); const { randomBytes } = require("crypto");
const output = path.resolve(__dirname, "../.env");
// Guard against overwriting an existing environment file to protect live credentials.
// Abort process execution if the root .env configuration already exists on disk.
// Prevents inadvertent loss of operator credentials or production deployment settings.
if (fs.existsSync(output)) throw new Error(".env already exists; keep existing deployment configuration.");
// Initialize empty configuration dictionary and generate 32-byte hexadecimal random keys.
// Produce cryptographically distinct secrets for database passwords and JWT token signing.
// Ensures high-entropy random keys for secure authentication and symmetric data encryption.
const values = {};
for (const key of ["MONGO_ROOT_PASSWORD", "MONGO_APP_PASSWORD", "JWT_ACCESS_TOKEN", "JWT_REFRESH_TOKEN", "JWT_VERIFICATION_TOKEN", "JWT_RESET_TOKEN", "USER_API_KEY_ENCRYPTION_KEY"]) values[key] = randomBytes(32).toString("hex");
// Populate standard default environment settings for local host, cookies, and AI providers.
// Specify baseline fallback parameters for Gemini, Groq, Together AI, and Brevo mailing.
// Establishes reproducible baseline parameters for local orchestration and services.
Object.assign(values, { PUBLIC_ORIGIN: "http://localhost:8080", COOKIE_SECURE: "false", AI_PROVIDER: "gemini", GEMINI_API_KEY: "", GEMINI_MODEL: "gemini-3.5-flash-lite", GROQ_API_KEY: "", GROQ_MODEL: "openai/gpt-oss-20b", TOGETHER_API_KEY: "", TOGETHER_MODEL: "", OPENROUTER_API_KEY: "", OPENROUTER_MODEL: "openrouter/free", XAI_API_KEY: "", XAI_MODEL: "", FIREWORKS_API_KEY: "", FIREWORKS_MODEL: "", BREVO_API_KEY: "", EMAIL_FROM_ADDRESS: "no-reply@example.com", EMAIL_FROM_NAME: "MedAssist AI" });
// Serialize configuration key-value mappings to target .env file with restricted 0600 permissions.
// Output confirmation message prompting operator to review external API and HTTPS settings.
// Guarantees restricted filesystem permissions so only the executing user can read secrets.
fs.writeFileSync(output, Object.entries(values).map(([key, value]) => key + "=" + value).join("\n") + "\n", { mode: 0o600 });
console.log("Created ignored .env with random secrets. Configure email, optional AI, and HTTPS settings before deployment.");
