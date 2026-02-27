const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  },
  tier: {
    type: String,
    enum: ["free", "pro", "enterprise"],
    default: "free",
    index: true,
  },
  status: {
    type: String,
    enum: ["active", "cancelled", "past_due", "trialing", "paused"],
    default: "active",
    index: true,
  },
  billingCycle: {
    type: String,
    enum: ["monthly", "yearly"],
    default: "monthly",
  },
  price: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: "USD",
  },
  currentPeriodStart: {
    type: Date,
    default: Date.now,
  },
  currentPeriodEnd: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  trialEnd: {
    type: Date,
    default: null,
  },
  metadata: {
    externalCustomerId: String,
    externalSubscriptionId: String,
    paymentMethod: String,
    lastPaymentDate: Date,
    nextPaymentDate: Date,
    failedPaymentAttempts: { type: Number, default: 0 },
  },
  usageOverrides: {
    messagesPerDay: Number,
    maxSessions: Number,
    maxTokensPerRequest: Number,
    pluginSlots: Number,
  },
  features: [String],
  history: [
    {
      action: {
        type: String,
        enum: ["created", "upgraded", "downgraded", "cancelled", "reactivated", "renewed", "paused"],
      },
      fromTier: String,
      toTier: String,
      timestamp: { type: Date, default: Date.now },
      reason: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

subscriptionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

subscriptionSchema.methods.isActive = function () {
  return this.status === "active" || this.status === "trialing";
};

subscriptionSchema.methods.isExpired = function () {
  return new Date() > this.currentPeriodEnd && this.status !== "active";
};

subscriptionSchema.methods.canUseFeature = function (feature) {
  return this.features.includes(feature);
};

subscriptionSchema.methods.getEffectiveLimit = function (limitName) {
  if (this.usageOverrides && this.usageOverrides[limitName] !== undefined) {
    return this.usageOverrides[limitName];
  }

  const { getTierConfig } = require("../config");
  const tierConfig = getTierConfig(this.tier);
  return tierConfig[limitName];
};

subscriptionSchema.statics.findActiveByUserId = function (userId) {
  return this.findOne({
    userId,
    status: { $in: ["active", "trialing"] },
  });
};

subscriptionSchema.statics.getSubscriptionStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: { tier: "$tier", status: "$status" },
        count: { $sum: 1 },
        totalRevenue: { $sum: "$price" },
      },
    },
  ]);

  return stats;
};

module.exports = mongoose.model("Subscription", subscriptionSchema);
