const billingService = require("../services/billing");
const featureFlagService = require("../services/featureFlags");
const { logger } = require("../services/logger");

const ROLES = {
  user: {
    permissions: [
      "chat:read",
      "chat:write",
      "chat:delete",
      "profile:read",
      "profile:update",
    ],
  },
  pro: {
    permissions: [
      "chat:read",
      "chat:write",
      "chat:delete",
      "profile:read",
      "profile:update",
      "api:access",
      "export:chat",
      "analytics:read",
    ],
  },
  admin: {
    permissions: [
      "chat:read",
      "chat:write",
      "chat:delete",
      "profile:read",
      "profile:update",
      "api:access",
      "export:chat",
      "analytics:read",
      "admin:read",
      "admin:write",
      "users:manage",
      "subscriptions:manage",
      "plugins:manage",
      "system:configure",
    ],
  },
};

function requirePermission(...requiredPermissions) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const subscription = await billingService.getSubscription(userId);
      const tier = subscription?.tier || "free";

      let role = "user";
      if (tier === "enterprise") role = "admin";
      else if (tier === "pro") role = "pro";

      const rolePermissions = ROLES[role]?.permissions || [];

      const hasPermission = requiredPermissions.every((perm) =>
        rolePermissions.includes(perm)
      );

      if (!hasPermission) {
        logger.warn("Permission denied", {
          userId,
          required: requiredPermissions,
          userRole: role,
          tier,
        });
        return res.status(403).json({
          error: "Insufficient permissions",
          required: requiredPermissions,
          currentTier: tier,
          upgradeUrl: "/api/subscription/upgrade",
        });
      }

      req.userRole = role;
      req.userTier = tier;
      req.userPermissions = rolePermissions;

      next();
    } catch (error) {
      logger.error("RBAC middleware error", { error: error.message });
      next(error);
    }
  };
}

function requireFeature(featureName) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const subscription = await billingService.getSubscription(userId);
      const tier = subscription?.tier || "free";

      const isEnabled = featureFlagService.isEnabled(featureName, tier, userId);

      if (!isEnabled) {
        return res.status(403).json({
          error: "Feature not available",
          feature: featureName,
          currentTier: tier,
          upgradeUrl: "/api/subscription/upgrade",
        });
      }

      next();
    } catch (error) {
      logger.error("Feature gate middleware error", { error: error.message });
      next(error);
    }
  };
}

function requireTier(...allowedTiers) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const subscription = await billingService.getSubscription(userId);
      const tier = subscription?.tier || "free";

      if (!allowedTiers.includes(tier)) {
        return res.status(403).json({
          error: "Tier upgrade required",
          currentTier: tier,
          requiredTiers: allowedTiers,
          upgradeUrl: "/api/subscription/upgrade",
        });
      }

      req.userTier = tier;
      next();
    } catch (error) {
      logger.error("Tier check middleware error", { error: error.message });
      next(error);
    }
  };
}

module.exports = { requirePermission, requireFeature, requireTier, ROLES };
