const billingService = require("../services/billing");
const usageTracker = require("../services/usageTracker");
const { logger } = require("../services/logger");

exports.getSubscription = async (req, res) => {
  try {
    const subscription = await billingService.getSubscription(req.user.id);
    const usage = usageTracker.getDailyUsage(req.user.id);
    const tokenUsage = usageTracker.getTokenUsage(req.user.id);

    res.json({
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        price: subscription.price,
        billingCycle: subscription.billingCycle,
        features: subscription.features,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      usage: {
        daily: usage,
        tokens: tokenUsage,
      },
      limits: {
        messagesPerDay: subscription.getEffectiveLimit("messagesPerDay"),
        maxSessions: subscription.getEffectiveLimit("maxSessions"),
        maxTokensPerRequest: subscription.getEffectiveLimit("maxTokensPerRequest"),
        pluginSlots: subscription.getEffectiveLimit("pluginSlots"),
      },
    });
  } catch (error) {
    logger.error("Get subscription error", { error: error.message });
    res.status(500).json({ error: "Failed to get subscription" });
  }
};

exports.upgrade = async (req, res) => {
  try {
    const { tier } = req.body;
    const subscription = await billingService.upgradeTier(req.user.id, tier);

    res.json({
      message: `Successfully upgraded to ${tier}`,
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        price: subscription.price,
        features: subscription.features,
      },
    });
  } catch (error) {
    logger.error("Upgrade error", { error: error.message });
    res.status(400).json({ error: error.message });
  }
};

exports.downgrade = async (req, res) => {
  try {
    const { tier } = req.body;
    const subscription = await billingService.downgradeTier(req.user.id, tier);

    res.json({
      message: `Downgraded to ${tier}`,
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        price: subscription.price,
        features: subscription.features,
      },
    });
  } catch (error) {
    logger.error("Downgrade error", { error: error.message });
    res.status(400).json({ error: error.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const { reason } = req.body;
    const subscription = await billingService.cancelSubscription(
      req.user.id,
      reason
    );

    res.json({
      message: "Subscription cancelled",
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        cancelledAt: subscription.cancelledAt,
      },
    });
  } catch (error) {
    logger.error("Cancel subscription error", { error: error.message });
    res.status(400).json({ error: error.message });
  }
};

exports.reactivate = async (req, res) => {
  try {
    const subscription = await billingService.reactivateSubscription(
      req.user.id
    );

    res.json({
      message: "Subscription reactivated",
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        features: subscription.features,
      },
    });
  } catch (error) {
    logger.error("Reactivate error", { error: error.message });
    res.status(400).json({ error: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const subscription = await billingService.getSubscription(req.user.id);
    res.json({
      history: subscription.history || [],
    });
  } catch (error) {
    logger.error("Get subscription history error", { error: error.message });
    res.status(500).json({ error: "Failed to get history" });
  }
};
