const mongoose = require("mongoose");
const crypto = require("crypto");

const apiKeySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  keyHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  keyPrefix: {
    type: String,
    required: true,
  },
  permissions: [
    {
      type: String,
      enum: [
        "chat:read",
        "chat:write",
        "chat:delete",
        "medical:query",
        "agent:invoke",
        "analytics:read",
        "plugins:use",
        "admin:read",
        "admin:write",
      ],
    },
  ],
  rateLimit: {
    requestsPerMinute: { type: Number, default: 60 },
    requestsPerDay: { type: Number, default: 1000 },
  },
  status: {
    type: String,
    enum: ["active", "revoked", "expired"],
    default: "active",
    index: true,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  lastUsedAt: {
    type: Date,
    default: null,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  metadata: {
    ipWhitelist: [String],
    description: String,
    environment: {
      type: String,
      enum: ["development", "staging", "production"],
      default: "development",
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

apiKeySchema.statics.generateKey = function () {
  const prefix = "mca";
  const key = crypto.randomBytes(32).toString("hex");
  const fullKey = `${prefix}_${key}`;
  const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");
  return {
    fullKey,
    keyHash,
    keyPrefix: `${prefix}_${key.substring(0, 8)}...`,
  };
};

apiKeySchema.statics.hashKey = function (key) {
  return crypto.createHash("sha256").update(key).digest("hex");
};

apiKeySchema.statics.findByKey = async function (rawKey) {
  const keyHash = this.hashKey(rawKey);
  const apiKey = await this.findOne({
    keyHash,
    status: "active",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });

  if (apiKey) {
    apiKey.lastUsedAt = new Date();
    apiKey.usageCount++;
    await apiKey.save();
  }

  return apiKey;
};

apiKeySchema.methods.hasPermission = function (permission) {
  return this.permissions.includes(permission);
};

apiKeySchema.methods.isExpired = function () {
  return this.expiresAt && new Date() > this.expiresAt;
};

apiKeySchema.methods.revoke = async function () {
  this.status = "revoked";
  await this.save();
};

module.exports = mongoose.model("ApiKey", apiKeySchema);
