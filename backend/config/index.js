const dotenv = require("dotenv");
dotenv.config();

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  jwt: {
    accessSecret: process.env.JWT_ACCESS_TOKEN,
    refreshSecret: process.env.JWT_REFRESH_TOKEN,
    verificationSecret: process.env.JWT_VERIFICATION_TOKEN,
    resetSecret: process.env.JWT_RESET_TOKEN,
    accessExpiry: "15m",
    refreshExpiry: "7d",
    verificationExpiry: "24h",
    resetExpiry: "1h",
  },

  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-API-Key"],
  },

  rateLimits: {
    free: { windowMs: 15 * 60 * 1000, max: 50 },
    pro: { windowMs: 15 * 60 * 1000, max: 500 },
    enterprise: { windowMs: 15 * 60 * 1000, max: 5000 },
  },

  subscriptionTiers: {
    free: {
      name: "Free",
      price: 0,
      messagesPerDay: 25,
      maxSessions: 10,
      features: ["basic_chat", "medical_query"],
      aiModel: "gemini-1.5-flash",
      maxTokensPerRequest: 1024,
      apiAccess: false,
      pluginSlots: 0,
    },
    pro: {
      name: "Pro",
      price: 19.99,
      messagesPerDay: 500,
      maxSessions: 100,
      features: [
        "basic_chat",
        "medical_query",
        "advanced_ai",
        "export_chat",
        "priority_support",
        "api_access",
        "analytics",
      ],
      aiModel: "gemini-1.5-pro",
      maxTokensPerRequest: 4096,
      apiAccess: true,
      pluginSlots: 5,
    },
    enterprise: {
      name: "Enterprise",
      price: 99.99,
      messagesPerDay: -1,
      maxSessions: -1,
      features: [
        "basic_chat",
        "medical_query",
        "advanced_ai",
        "export_chat",
        "priority_support",
        "api_access",
        "analytics",
        "admin_panel",
        "custom_models",
        "sso",
        "audit_log",
        "dedicated_support",
        "plugin_marketplace",
        "agent_system",
      ],
      aiModel: "gemini-1.5-pro",
      maxTokensPerRequest: 8192,
      apiAccess: true,
      pluginSlots: -1,
    },
  },

  cache: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 300,
    maxSize: parseInt(process.env.CACHE_MAX_SIZE, 10) || 1000,
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD, 10) || 120,
  },

  queue: {
    maxConcurrent: parseInt(process.env.QUEUE_MAX_CONCURRENT, 10) || 5,
    retryAttempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS, 10) || 3,
    retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY, 10) || 1000,
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    enableConsole: process.env.LOG_CONSOLE !== "false",
    enableFile: process.env.LOG_FILE === "true",
    filePath: process.env.LOG_FILE_PATH || "./logs",
  },

  brevo: {
    apiKey: process.env.BREVO_API_KEY,
    senderEmail: process.env.SENDER_EMAIL || "23bds033@iiitdwd.ac.in",
    senderName: process.env.SENDER_NAME || "Medical Chat App",
  },

  pubmed: {
    baseUrl: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils",
    maxResults: parseInt(process.env.PUBMED_MAX_RESULTS, 10) || 3,
    timeout: parseInt(process.env.PUBMED_TIMEOUT, 10) || 10000,
  },
};

function getConfig() {
  return Object.freeze(config);
}

function getTierConfig(tierName) {
  return config.subscriptionTiers[tierName] || config.subscriptionTiers.free;
}

function getRateLimitConfig(tierName) {
  return config.rateLimits[tierName] || config.rateLimits.free;
}

module.exports = { getConfig, getTierConfig, getRateLimitConfig };
