const Subscription = require("../models/subscriptionModel");
const { getTierConfig } = require("../config");
const { logger } = require("./logger");
const analyticsEngine = require("./analytics");

class BillingService {
  async createSubscription(userId, tier = "free") {
    const tierConfig = getTierConfig(tier);

    const existing = await Subscription.findOne({ userId });
    if (existing) {
      logger.warn("Subscription already exists for user", { userId });
      return existing;
    }

    const subscription = new Subscription({
      userId,
      tier,
      status: "active",
      price: tierConfig.price,
      features: tierConfig.features,
      history: [
        {
          action: "created",
          toTier: tier,
          reason: "New account registration",
        },
      ],
    });

    await subscription.save();

    analyticsEngine.track("subscription_created", userId, { tier });
    logger.info("Subscription created", { userId, tier });

    return subscription;
  }

  async getSubscription(userId) {
    let subscription = await Subscription.findOne({ userId });
    if (!subscription) {
      subscription = await this.createSubscription(userId, "free");
    }
    return subscription;
  }

  async upgradeTier(userId, newTier) {
    const subscription = await this.getSubscription(userId);
    const oldTier = subscription.tier;

    if (oldTier === newTier) {
      throw new Error("Already on this tier");
    }

    const tierOrder = { free: 0, pro: 1, enterprise: 2 };
    if (tierOrder[newTier] <= tierOrder[oldTier]) {
      throw new Error("Use downgrade endpoint for tier downgrade");
    }

    const newTierConfig = getTierConfig(newTier);

    subscription.tier = newTier;
    subscription.price = newTierConfig.price;
    subscription.features = newTierConfig.features;
    subscription.currentPeriodStart = new Date();
    subscription.currentPeriodEnd = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );
    subscription.status = "active";
    subscription.history.push({
      action: "upgraded",
      fromTier: oldTier,
      toTier: newTier,
      reason: `User upgraded from ${oldTier} to ${newTier}`,
    });

    await subscription.save();

    analyticsEngine.track("subscription_upgraded", userId, {
      fromTier: oldTier,
      toTier: newTier,
      price: newTierConfig.price,
    });

    logger.info("Subscription upgraded", { userId, fromTier: oldTier, toTier: newTier });

    return subscription;
  }

  async downgradeTier(userId, newTier) {
    const subscription = await this.getSubscription(userId);
    const oldTier = subscription.tier;

    const tierOrder = { free: 0, pro: 1, enterprise: 2 };
    if (tierOrder[newTier] >= tierOrder[oldTier]) {
      throw new Error("Use upgrade endpoint for tier upgrade");
    }

    const newTierConfig = getTierConfig(newTier);

    subscription.tier = newTier;
    subscription.price = newTierConfig.price;
    subscription.features = newTierConfig.features;
    subscription.history.push({
      action: "downgraded",
      fromTier: oldTier,
      toTier: newTier,
      reason: `User downgraded from ${oldTier} to ${newTier}`,
    });

    await subscription.save();

    analyticsEngine.track("subscription_downgraded", userId, {
      fromTier: oldTier,
      toTier: newTier,
    });

    logger.info("Subscription downgraded", { userId, fromTier: oldTier, toTier: newTier });

    return subscription;
  }

  async cancelSubscription(userId, reason = "") {
    const subscription = await this.getSubscription(userId);

    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();
    subscription.history.push({
      action: "cancelled",
      fromTier: subscription.tier,
      toTier: subscription.tier,
      reason: reason || "User cancelled subscription",
    });

    await subscription.save();

    analyticsEngine.track("subscription_cancelled", userId, {
      tier: subscription.tier,
      reason,
    });

    logger.info("Subscription cancelled", { userId, tier: subscription.tier });

    return subscription;
  }

  async reactivateSubscription(userId) {
    const subscription = await this.getSubscription(userId);

    if (subscription.status === "active") {
      throw new Error("Subscription is already active");
    }

    subscription.status = "active";
    subscription.cancelledAt = null;
    subscription.currentPeriodStart = new Date();
    subscription.currentPeriodEnd = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );
    subscription.history.push({
      action: "reactivated",
      fromTier: subscription.tier,
      toTier: subscription.tier,
      reason: "User reactivated subscription",
    });

    await subscription.save();

    analyticsEngine.track("subscription_reactivated", userId, {
      tier: subscription.tier,
    });

    return subscription;
  }

  async getRevenueAnalytics() {
    const stats = await Subscription.getSubscriptionStats();

    let totalMRR = 0;
    const tierBreakdown = {};

    for (const stat of stats) {
      if (stat._id.status === "active") {
        totalMRR += stat.totalRevenue;
        tierBreakdown[stat._id.tier] = {
          count: stat.count,
          revenue: stat.totalRevenue,
        };
      }
    }

    return {
      totalMRR,
      estimatedARR: totalMRR * 12,
      tierBreakdown,
      totalSubscriptions: stats.reduce((acc, s) => acc + s.count, 0),
    };
  }

  async checkFeatureAccess(userId, feature) {
    const subscription = await this.getSubscription(userId);
    if (!subscription.isActive()) {
      return { allowed: false, reason: "Subscription is not active" };
    }

    const hasFeature = subscription.features.includes(feature);
    return {
      allowed: hasFeature,
      reason: hasFeature
        ? "Access granted"
        : `Feature '${feature}' requires a higher tier`,
      currentTier: subscription.tier,
      requiredTier: this._getMinimumTierForFeature(feature),
    };
  }

  _getMinimumTierForFeature(feature) {
    const { getConfig } = require("../config");
    const config = getConfig();
    for (const [tier, tierConfig] of Object.entries(config.subscriptionTiers)) {
      if (tierConfig.features.includes(feature)) return tier;
    }
    return "enterprise";
  }
}

const billingService = new BillingService();
module.exports = billingService;
