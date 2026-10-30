const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { randomUUID } = require("crypto");
const authenticate = require("./middleware/authToken");
const { version } = require("./package.json");

function createApp({ services = {}, limits = true } = {}) {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY.split(",").map((value) => value.trim()));
  const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",").map((origin) => origin.trim()).filter(Boolean);
  app.locals.allowedOrigins = allowedOrigins; app.locals.services = services;
  app.use((req, res, next) => {
    const supplied = req.get("x-request-id");
    req.requestId = supplied && /^[a-zA-Z0-9-]{8,80}$/.test(supplied) ? supplied : randomUUID();
    res.set({ "x-request-id": req.requestId, "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "no-referrer", "permissions-policy": "camera=(), microphone=(), geolocation=()", "cache-control": "no-store" });
    if (process.env.STRUCTURED_LOGS === "true") {
      const start = Date.now();
      res.on("finish", () => console.log(JSON.stringify({ requestId: req.requestId, method: req.method, route: req.route?.path || req.baseUrl || "unmatched", status: res.statusCode, durationMs: Date.now() - start })));
    }
    next();
  });
  app.use(cors({ origin(origin, callback) { callback(origin && !allowedOrigins.includes(origin) ? Object.assign(new Error("Origin is not allowed."), { status: 403, code: "ORIGIN_DENIED" }) : null, true); }, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "X-Request-Id"], exposedHeaders: ["x-request-id", "retry-after"] }));
  app.use(express.json({ limit: "32kb" })); app.use(cookieParser());
  app.use((req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      const fetchSite = req.get("sec-fetch-site");
      if ((origin && !allowedOrigins.includes(origin)) || fetchSite === "cross-site") return res.status(403).json({ code: "ORIGIN_DENIED", message: "Origin is not allowed.", requestId: req.requestId });
      // Cookie-authenticated browser writes require an exact Origin in production.
      // This also covers a browser or proxy that omits Origin but sends cookies.
      if (process.env.NODE_ENV === "production" && req.get("cookie") && !origin) return res.status(403).json({ code: "ORIGIN_REQUIRED", message: "A same-origin request is required.", requestId: req.requestId });
    }
    next();
  });
  app.get("/api/health", (req, res) => res.json({ status: "ok", version }));
  app.get("/api/ready", (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "unavailable", database: ready ? "connected" : "disconnected", aiConfigured: require("./services/modelProvider").providerConfigured(), emailConfigured: Boolean(process.env.BREVO_API_KEY), requestId: req.requestId });
  });
  const pass = (req, res, next) => next();
  const limiter = (limit, windowMs, keyGenerator) => limits ? rateLimit({ limit, windowMs, ...(keyGenerator ? { keyGenerator } : {}), standardHeaders: "draft-7", legacyHeaders: false, message: { code: "RATE_LIMIT", message: "Too many requests. Please wait and try again." } }) : pass;
  app.locals.authLimiter = limiter(30, 15 * 60000);
  app.locals.recoveryLimiter = limiter(5, 15 * 60000);
  app.use("/api/auth", require("./routes/authRoute"));
  app.use("/api", require("./routes/chatRoute"));
  app.locals.settingsLimiter = limiter(12, 15 * 60000, (req) => req.user.id);
  app.use("/api/settings", authenticate, require("./routes/settingsRoute"));
  const aiLimiter = limiter(20, 60000, (req) => req.user.id);
  app.use("/api/ai", authenticate, aiLimiter, require("./routes/aiRoute"));
  app.use("/api/medical", authenticate, aiLimiter, require("./routes/medicalRoute"));
  app.use("/api/analytics", require("./routes/analyticsRoute"));
  app.use((req, res) => res.status(404).json({ code: "NOT_FOUND", message: "API route not found.", requestId: req.requestId }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.type === "entity.too.large" ? 413 : error instanceof SyntaxError && error.status === 400 ? 400 : error.status || 500;
    if (status >= 500 && process.env.STRUCTURED_LOGS === "true") console.error(JSON.stringify({ requestId: req.requestId, code: error.code || "INTERNAL", status }));
    res.status(status).json({ code: error.code || (status === 413 ? "BODY_TOO_LARGE" : status === 400 ? "INVALID_INPUT" : "INTERNAL"), message: status === 413 ? "Request body is too large." : status < 500 || error.code === "AI_UNAVAILABLE" ? error.message : "Service unavailable. Please try again.", requestId: req.requestId });
  });
  return app;
}
module.exports = createApp();
module.exports.createApp = createApp;
