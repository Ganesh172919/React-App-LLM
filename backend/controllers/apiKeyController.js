const apiKeyManager = require("../services/apiKeyManager");
const { logger } = require("../services/logger");

exports.createKey = async (req, res) => {
  try {
    const { name, permissions, expiresIn, description, environment } = req.body;

    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);
    }

    const result = await apiKeyManager.createKey(req.user.id, name, {
      permissions,
      expiresAt,
      description,
      environment,
    });

    res.status(201).json({
      message: "API key created successfully",
      warning: "Store this key securely - it won't be shown again",
      ...result,
    });
  } catch (error) {
    logger.error("Create API key error", { error: error.message });
    res.status(500).json({ error: "Failed to create API key" });
  }
};

exports.listKeys = async (req, res) => {
  try {
    const keys = await apiKeyManager.listKeys(req.user.id);
    const stats = await apiKeyManager.getKeyStats(req.user.id);

    res.json({ keys, stats });
  } catch (error) {
    logger.error("List API keys error", { error: error.message });
    res.status(500).json({ error: "Failed to list API keys" });
  }
};

exports.revokeKey = async (req, res) => {
  try {
    const { keyId } = req.params;
    await apiKeyManager.revokeKey(req.user.id, keyId);

    res.json({ message: "API key revoked successfully" });
  } catch (error) {
    logger.error("Revoke API key error", { error: error.message });
    res.status(400).json({ error: error.message });
  }
};

exports.updatePermissions = async (req, res) => {
  try {
    const { keyId } = req.params;
    const { permissions } = req.body;

    await apiKeyManager.updateKeyPermissions(req.user.id, keyId, permissions);

    res.json({ message: "API key permissions updated" });
  } catch (error) {
    logger.error("Update API key error", { error: error.message });
    res.status(400).json({ error: error.message });
  }
};
