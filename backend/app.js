const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

app.use(express.json());
app.use(cookieParser());

const chatRoutes = require("./routes/chatRoute");
const authRoutes = require("./routes/authRoute");
const medicalRoutes = require("./routes/medicalRoute");
const aiRoutes = require("./routes/aiRoute");
const analyticsRoutes = require("./routes/analyticsRoute");

app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);
app.use("/api/medical", medicalRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
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

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error("Request error:", error.message);
  return res.status(500).json({ message: "Unexpected server error" });
});

module.exports = app;
