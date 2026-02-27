const { logger } = require("./logger");

class FeatureFlagService {
  constructor() {
    this.flags = new Map();
    this.overrides = new Map();
    this._initializeDefaults();
  }

  _initializeDefaults() {
    const defaults = {
      medical_query: {
        enabled: true,
        description: "PubMed medical query integration",
        tiers: ["free", "pro", "enterprise"],
        rolloutPercentage: 100,
      },
      advanced_ai: {
        enabled: true,
        description: "Advanced AI model access (Gemini Pro)",
        tiers: ["pro", "enterprise"],
        rolloutPercentage: 100,
      },
      export_chat: {
        enabled: true,
        description: "Export chat history as JSON/PDF",
        tiers: ["pro", "enterprise"],
        rolloutPercentage: 100,
      },
      api_access: {
        enabled: true,
        description: "REST API access with API keys",
        tiers: ["pro", "enterprise"],
        rolloutPercentage: 100,
      },
      plugin_system: {
        enabled: true,
        description: "Plugin marketplace and custom plugins",
        tiers: ["enterprise"],
        rolloutPercentage: 100,
      },
      agent_system: {
        enabled: true,
        description: "AI agent code generation system",
        tiers: ["enterprise"],
        rolloutPercentage: 100,
      },
      analytics_dashboard: {
        enabled: true,
        description: "Usage analytics dashboard",
        tiers: ["pro", "enterprise"],
        rolloutPercentage: 100,
      },
      admin_panel: {
        enabled: true,
        description: "Admin control panel",
        tiers: ["enterprise"],
        rolloutPercentage: 100,
      },
      real_time_collab: {
        enabled: false,
        description: "Real-time collaboration on chats",
        tiers: ["enterprise"],
        rolloutPercentage: 0,
      },
      custom_models: {
        enabled: false,
        description: "Custom fine-tuned model support",
        tiers: ["enterprise"],
        rolloutPercentage: 0,
      },
      sso: {
        enabled: false,
        description: "Single Sign-On integration",
        tiers: ["enterprise"],
        rolloutPercentage: 0,
      },
      audit_log: {
        enabled: true,
        description: "Audit logging for compliance",
        tiers: ["enterprise"],
        rolloutPercentage: 100,
      },
      websocket_sync: {
        enabled: true,
        description: "Real-time WebSocket sync",
        tiers: ["free", "pro", "enterprise"],
        rolloutPercentage: 100,
      },
    };

    Object.entries(defaults).forEach(([key, value]) => {
      this.flags.set(key, value);
    });

    logger.info("Feature flags initialized", {
      totalFlags: this.flags.size,
    });
  }

  isEnabled(flagName, userTier = "free", userId = null) {
    const flag = this.flags.get(flagName);
    if (!flag) {
      logger.warn("Unknown feature flag requested", { flagName });
      return false;
    }

    if (!flag.enabled) return false;

    if (userId) {
      const override = this.overrides.get(`${flagName}:${userId}`);
      if (override !== undefined) return override;
    }

    if (!flag.tiers.includes(userTier)) return false;

    if (flag.rolloutPercentage < 100) {
      if (!userId) return false;
      const hash = this._hashUserId(userId, flagName);
      return hash < flag.rolloutPercentage;
    }

    return true;
  }

  _hashUserId(userId, flagName) {
    const str = `${userId}:${flagName}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash) % 100;
  }

  setFlag(flagName, config) {
    this.flags.set(flagName, { ...this.flags.get(flagName), ...config });
    logger.info("Feature flag updated", { flagName, config });
  }

  setUserOverride(flagName, userId, enabled) {
    this.overrides.set(`${flagName}:${userId}`, enabled);
    logger.info("Feature flag user override set", {
      flagName,
      userId,
      enabled,
    });
  }

  removeUserOverride(flagName, userId) {
    this.overrides.delete(`${flagName}:${userId}`);
  }

  getAllFlags() {
    const result = {};
    this.flags.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  getUserFlags(userTier, userId) {
    const result = {};
    this.flags.forEach((value, key) => {
      result[key] = {
        ...value,
        enabledForUser: this.isEnabled(key, userTier, userId),
      };
    });
    return result;
  }
}

const featureFlagService = new FeatureFlagService();
module.exports = featureFlagService;
