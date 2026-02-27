const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

dotenv.config();

const { getConfig } = require("./config");
const { logger, httpLoggerMiddleware } = require("./services/logger");
const performanceMonitor = require("./services/performanceMonitor");
const { authenticateApiKey } = require("./middleware/apiKeyAuth");
const tierRateLimit = require("./middleware/tierRateLimit");

const config = getConfig();
const app = express();

app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(httpLoggerMiddleware);
app.use(performanceMonitor.requestMiddleware());
app.use(authenticateApiKey);

const chatRoutes = require("./routes/chatRoute");
const authRoutes = require("./routes/authRoute");
const medicalRoutes = require("./routes/medicalRoute");
const subscriptionRoutes = require("./routes/subscriptionRoute");
const apiKeyRoutes = require("./routes/apiKeyRoute");
const agentRoutes = require("./routes/agentRoute");
const analyticsRoutes = require("./routes/analyticsRoute");
const adminRoutes = require("./routes/adminRoute");
const pluginRoutes = require("./routes/pluginRoute");

app.use("/api/auth", authRoutes);
app.use("/api", tierRateLimit, chatRoutes);
app.use("/api/medical", tierRateLimit, medicalRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/keys", apiKeyRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/plugins", pluginRoutes);

app.use((err, req, res, _next) => {
  logger.error("Unhandled error", {
    error: err,
    path: req.path,
    method: req.method,
  });
  res.status(err.status || 500).json({
    error: config.env === "production" ? "Internal server error" : err.message,
  });
});

mongoose
  .connect(config.mongoUri)
  .then(() => {
    logger.info("MongoDB connected");
  })
  .catch((err) => {
    logger.error("MongoDB connection error", { error: err });
  });

module.exports = app;
