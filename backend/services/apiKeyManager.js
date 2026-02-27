const ApiKey = require("../models/apiKeyModel");
const { logger } = require("./logger");
const analyticsEngine = require("./analytics");

class ApiKeyManager {
  async createKey(userId, name, options = {}) {
    const { fullKey, keyHash, keyPrefix } = ApiKey.generateKey();

    const apiKey = new ApiKey({
      userId,
      name,
      keyHash,
      keyPrefix,
      permissions: options.permissions || ["chat:read", "chat:write"],
      rateLimit: {
        requestsPerMinute: options.requestsPerMinute || 60,
        requestsPerDay: options.requestsPerDay || 1000,
      },
      expiresAt: options.expiresAt || null,
      metadata: {
        ipWhitelist: options.ipWhitelist || [],
        description: options.description || "",
        environment: options.environment || "development",
      },
    });

    await apiKey.save();

    analyticsEngine.track("api_key_created", userId, { keyName: name });
    logger.info("API key created", { userId, keyName: name, keyPrefix });

    return {
      key: fullKey,
      id: apiKey._id,
      name: apiKey.name,
      prefix: keyPrefix,
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async validateKey(rawKey) {
    if (!rawKey || !rawKey.startsWith("mca_")) {
      return { valid: false, reason: "Invalid key format" };
    }

    const apiKey = await ApiKey.findByKey(rawKey);
    if (!apiKey) {
      return { valid: false, reason: "Key not found or expired" };
    }

    if (apiKey.status !== "active") {
      return { valid: false, reason: `Key is ${apiKey.status}` };
    }

    if (apiKey.isExpired()) {
      apiKey.status = "expired";
      await apiKey.save();
      return { valid: false, reason: "Key has expired" };
    }

    return {
      valid: true,
      userId: apiKey.userId,
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
      metadata: apiKey.metadata,
    };
  }

  async listKeys(userId) {
    const keys = await ApiKey.find({ userId, status: { $ne: "revoked" } })
      .select("-keyHash")
      .sort({ createdAt: -1 });

    return keys.map((k) => ({
      id: k._id,
      name: k.name,
      prefix: k.keyPrefix,
      permissions: k.permissions,
      status: k.status,
      lastUsedAt: k.lastUsedAt,
      usageCount: k.usageCount,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
    }));
  }

  async revokeKey(userId, keyId) {
    const apiKey = await ApiKey.findOne({ _id: keyId, userId });
    if (!apiKey) {
      throw new Error("API key not found");
    }

    await apiKey.revoke();

    analyticsEngine.track("api_key_revoked", userId, { keyId });
    logger.info("API key revoked", { userId, keyId });

    return { success: true, keyId };
  }

  async updateKeyPermissions(userId, keyId, permissions) {
    const apiKey = await ApiKey.findOne({ _id: keyId, userId });
    if (!apiKey) {
      throw new Error("API key not found");
    }

    apiKey.permissions = permissions;
    await apiKey.save();

    logger.info("API key permissions updated", { userId, keyId, permissions });
    return apiKey;
  }

  async getKeyStats(userId) {
    const keys = await ApiKey.find({ userId });
    return {
      total: keys.length,
      active: keys.filter((k) => k.status === "active").length,
      revoked: keys.filter((k) => k.status === "revoked").length,
      totalUsage: keys.reduce((sum, k) => sum + k.usageCount, 0),
    };
  }
}

const apiKeyManager = new ApiKeyManager();
module.exports = apiKeyManager;
