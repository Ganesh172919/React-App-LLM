const apiKeyManager = require("../services/apiKeyManager");
const { logger } = require("../services/logger");

async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  // This middleware is optional - if no API key header is provided, fall
  // through to the next authentication layer (e.g., JWT cookie auth).
  // Routes that require authentication should always use authenticateToken.
  if (!apiKey) {
    return next();
  }

  try {
    const result = await apiKeyManager.validateKey(apiKey);

    if (!result.valid) {
      return res.status(401).json({
        error: "Invalid API key",
        reason: result.reason,
      });
    }

    req.user = { id: result.userId };
    req.apiKeyAuth = true;
    req.apiKeyPermissions = result.permissions;
    req.apiKeyRateLimit = result.rateLimit;

    next();
  } catch (error) {
    logger.error("API key authentication error", { error: error.message });
    res.status(500).json({ error: "Authentication error" });
  }
}

function requireApiPermission(permission) {
  return (req, res, next) => {
    if (!req.apiKeyAuth) {
      return next();
    }

    if (!req.apiKeyPermissions.includes(permission)) {
      return res.status(403).json({
        error: "API key lacks required permission",
        required: permission,
        current: req.apiKeyPermissions,
      });
    }

    next();
  };
}

module.exports = { authenticateApiKey, requireApiPermission };
