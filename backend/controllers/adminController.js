const User = require("../models/userModel");
const Subscription = require("../models/subscriptionModel");
const Chat = require("../models/chatModel");
const AuditLog = require("../models/auditLogModel");
const performanceMonitor = require("../services/performanceMonitor");
const featureFlagService = require("../services/featureFlags");
const jobQueue = require("../services/jobQueue");
const cacheService = require("../services/cache");
const { logger } = require("../services/logger");

exports.getSystemHealth = async (req, res) => {
  try {
    const health = performanceMonitor.getHealthStatus();
    const queueHealth = jobQueue.getQueueHealth();
    const cacheStats = cacheService.getStats();

    res.json({
      status: health.status,
      uptime: health.uptime,
      memory: health.memory,
      queue: queueHealth,
      cache: cacheStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Health check error", { error: error.message });
    res.status(500).json({ status: "error", error: error.message });
  }
};

exports.getSystemStats = async (req, res) => {
  try {
    const [userCount, chatCount, subscriptionStats] = await Promise.all([
      User.countDocuments(),
      Chat.countDocuments(),
      Subscription.getSubscriptionStats(),
    ]);

    res.json({
      users: { total: userCount },
      chats: { total: chatCount },
      subscriptions: subscriptionStats,
      metrics: performanceMonitor.getMetrics(),
    });
  } catch (error) {
    logger.error("Get system stats error", { error: error.message });
    res.status(500).json({ error: "Failed to get system stats" });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .select("-password -refreshToken -verificationToken -resetToken")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments(),
    ]);

    const usersWithSubs = await Promise.all(
      users.map(async (user) => {
        const sub = await Subscription.findOne({ userId: user._id }).lean();
        return {
          ...user,
          subscription: sub
            ? { tier: sub.tier, status: sub.status }
            : { tier: "free", status: "active" },
        };
      })
    );

    res.json({
      users: usersWithSubs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("List users error", { error: error.message });
    res.status(500).json({ error: "Failed to list users" });
  }
};

exports.getFeatureFlags = async (req, res) => {
  try {
    const flags = featureFlagService.getAllFlags();
    res.json({ flags });
  } catch (error) {
    logger.error("Get feature flags error", { error: error.message });
    res.status(500).json({ error: "Failed to get feature flags" });
  }
};

exports.updateFeatureFlag = async (req, res) => {
  try {
    const { flagName } = req.params;
    const config = req.body;

    featureFlagService.setFlag(flagName, config);

    await AuditLog.log({
      userId: req.user.id,
      action: "update_feature_flag",
      resource: "feature_flag",
      resourceId: flagName,
      details: config,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json({
      message: "Feature flag updated",
      flag: { name: flagName, ...featureFlagService.getAllFlags()[flagName] },
    });
  } catch (error) {
    logger.error("Update feature flag error", { error: error.message });
    res.status(400).json({ error: error.message });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.userId) filter.userId = req.query.userId;

    const logs = await AuditLog.getRecentLogs(limit, filter);
    res.json({ logs });
  } catch (error) {
    logger.error("Get audit logs error", { error: error.message });
    res.status(500).json({ error: "Failed to get audit logs" });
  }
};

exports.getQueueStatus = async (req, res) => {
  try {
    const stats = jobQueue.getStats();
    const health = jobQueue.getQueueHealth();
    res.json({ stats, health });
  } catch (error) {
    logger.error("Get queue status error", { error: error.message });
    res.status(500).json({ error: "Failed to get queue status" });
  }
};
