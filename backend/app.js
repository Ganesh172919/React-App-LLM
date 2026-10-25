/**
 * ============================================================================
 * MEDASSIST AI - EXPRESS APPLICATION CONFIGURATION (app.js)
 * ============================================================================
 * Role:
 *   Configures and bootstraps the Express REST application layer. Establishes
 *   security headers, CORS whitelisting, rate limiting policies, JSON payload
 *   guards, cookie parsing, MongoDB database connectivity, route mounting, and
 *   centralized error handling with request tracing.
 *
 * Security & Reliability Highlights:
 *   - Header Hardening: Sets X-Request-ID (UUID), X-Content-Type-Options (nosniff),
 *     Referrer-Policy (no-referrer), and strict Permissions-Policy. Disables X-Powered-By.
 *   - Payload Guard: Limits incoming JSON bodies to 32kb to eliminate DOS via memory exhaustion.
 *   - Rate Limiting: Applies `aiLimiter` (20 requests / 60 seconds) strictly on
 *     `/api/medical` and `/api/ai` endpoints to safeguard LLM quotas and PubMed API limits.
 *   - Health Endpoint: Exposes `/api/health` with process uptime, MongoDB connection
 *     state, Gemini configuration status, and server version.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: EXPRESS MIDDLEWARE & ROUTING PIPELINE
 * ----------------------------------------------------------------------------
 * [Inbound HTTP Request]
 *   │
 *   ├── 1. Global Security & Tracing Middleware
 *   │     ├── Assigns or retains req.requestId (UUID v4)
 *   │     ├── Sets security headers (nosniff, no-referrer, permissions-policy)
 *   │     └── Removes x-powered-by header
 *   │
 *   ├── 2. CORS Validation Layer
 *   │     ├── Validates Origin header against app.locals.allowedOrigins
 *   │     ├── Rejects unauthorized origins with 403 status
 *   │     └── Enables credentials support for HTTP-only cookies
 *   │
 *   ├── 3. Body Parsing & Cookie Parser
 *   │     ├── express.json({ limit: "32kb" }) -> Enforces body size restriction
 *   │     └── cookieParser() -> Extracts accessToken and refreshToken
 *   │
 *   ├── 4. Routing & Rate-Limiting Layer
 *   │     ├── /api/auth       ──> Auth Routes (register, login, tokens, password reset)
 *   │     ├── /api            ──> Chat Routes (save, history, delete, rename)
 *   │     ├── /api/medical    ──> aiLimiter (20 req/min) ──> Medical PubMed Routes
 *   │     ├── /api/ai         ──> aiLimiter (20 req/min) ──> General Gemini Chat Routes
 *   │     ├── /api/analytics  ──> Analytics Routes (dashboard overview & dataset profile)
 *   │     └── /api/health     ──> System Health & Service Readiness
 *   │
 *   ├── 5. 404 Route Fallback
 *   │     └── Emits 404 JSON with message: "API route not found" + req.requestId
 *   │
 *   └── 6. Centralized Error Boundary Middleware
 *         ├── SyntaxError (Malformed JSON) ──> 400 Bad Request
 *         ├── entity.too.large              ──> 413 Payload Too Large
 *         ├── CORS Origin Rejection         ──> 403 Forbidden
 *         └── Default Server Exception      ──> 500 Internal Server Error
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: REQUEST PROCESSING LIFECYCLE
 * ----------------------------------------------------------------------------
 *  [Client Request]
 *         │
 *         ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ 1. Tracing: Set req.requestId & Security Headers       │
 *  └────────────────────────────────────────────────────────┘
 *         │
 *         ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ 2. CORS Whitelist: matches CLIENT_ORIGIN / FRONTEND_URL│
 *  └────────────────────────────────────────────────────────┘
 *         │ [Pass]
 *         ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ 3. Body Parser (limit: 32kb) & Cookie Parser           │
 *  └────────────────────────────────────────────────────────┘
 *         │
 *         ├──► [Exceeds 32kb] ──► 413 "Request body is too large"
 *         ├──► [Malformed]    ──► 400 "Request body contains invalid JSON"
 *         │
 *         ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ 4. Route Dispatcher                                    │
 *  │    ├── /api/auth       ──► authRouter                  │
 *  │    ├── /api            ──► chatRouter                  │
 *  │    ├── /api/medical    ──► [RateLimit: 20/min] ──► med │
 *  │    ├── /api/ai         ──► [RateLimit: 20/min] ──► ai  │
 *  │    ├── /api/analytics  ──► analyticsRouter             │
 *  │    └── /api/health     ──► Health Status JSON          │
 *  └────────────────────────────────────────────────────────┘
 *         │
 *         ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ 5. Error Boundary: Uniform JSON error with requestId   │
 *  └────────────────────────────────────────────────────────┘
 * ============================================================================
 */
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { randomUUID } = require("crypto");
const { version } = require("./package.json");

dotenv.config();

const app = express();
app.disable("x-powered-by");

const allowedOrigins = (process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.locals.allowedOrigins = allowedOrigins;

app.use((req, res, next) => {
  req.requestId = req.get("x-request-id") || randomUUID();
  res.setHeader("x-request-id", req.requestId);
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many AI requests; please wait and try again" },
});

const chatRoutes = require("./routes/chatRoute");
const authRoutes = require("./routes/authRoute");
const medicalRoutes = require("./routes/medicalRoute");
const aiRoutes = require("./routes/aiRoute");
const analyticsRoutes = require("./routes/analyticsRoute");

app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);
app.use("/api/medical", aiLimiter, medicalRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    version,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    requestId: req.requestId,
    database: ["disconnected", "connected", "connecting", "disconnecting"]
      [mongoose.connection.readyState] || "unknown",
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("MongoDB connected");
    })
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
    });
} else {
  console.warn("MONGO_URI is not configured; database-backed routes will be unavailable");
}

app.use((req, res) => {
  res.status(404).json({ message: "API route not found", requestId: req.requestId });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const badJson = error instanceof SyntaxError && error.status === 400 && "body" in error;
  const tooLarge = error.type === "entity.too.large";
  const corsError = error.message === "Origin is not allowed by CORS";
  const status = badJson ? 400 : tooLarge ? 413 : corsError ? 403 : 500;
  console.error(`[${req.requestId}] Request error:`, error.message);
  return res.status(status).json({
    message: badJson
      ? "Request body contains invalid JSON"
      : tooLarge
        ? "Request body is too large"
        : corsError
          ? "Origin is not allowed"
          : "Unexpected server error",
    requestId: req.requestId,
  });
});

module.exports = app;
