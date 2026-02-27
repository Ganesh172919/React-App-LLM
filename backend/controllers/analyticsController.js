const analyticsEngine = require("../services/analytics");
const usageTracker = require("../services/usageTracker");
const performanceMonitor = require("../services/performanceMonitor");
const cacheService = require("../services/cache");
const jobQueue = require("../services/jobQueue");
const { logger } = require("../services/logger");

exports.getUserAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const usage = usageTracker.getUserAnalytics(req.user.id, days);
    const journey = analyticsEngine.getUserJourney(req.user.id, 20);
    const tokenUsage = usageTracker.getTokenUsage(req.user.id);

    res.json({
      usage,
      journey,
      tokenUsage,
      period: `${days} days`,
    });
  } catch (error) {
    logger.error("Get user analytics error", { error: error.message });
    res.status(500).json({ error: "Failed to get analytics" });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const summary = analyticsEngine.getDashboardSummary();
    const systemAnalytics = usageTracker.getSystemAnalytics();
    const performance = performanceMonitor.getMetrics();
    const cacheStats = cacheService.getStats();
    const queueHealth = jobQueue.getQueueHealth();

    res.json({
      summary,
      system: systemAnalytics,
      performance,
      cache: cacheStats,
      queue: queueHealth,
    });
  } catch (error) {
    logger.error("Get dashboard error", { error: error.message });
    res.status(500).json({ error: "Failed to get dashboard data" });
  }
};

exports.getFunnels = async (req, res) => {
  try {
    const { funnelName } = req.params;

    if (funnelName) {
      const funnel = analyticsEngine.getFunnelAnalysis(funnelName);
      if (!funnel) {
        return res.status(404).json({ error: "Funnel not found" });
      }
      return res.json(funnel);
    }

    const funnels = ["user_activation", "api_adoption", "feature_discovery"].map(
      (name) => analyticsEngine.getFunnelAnalysis(name)
    );

    res.json({ funnels });
  } catch (error) {
    logger.error("Get funnels error", { error: error.message });
    res.status(500).json({ error: "Failed to get funnel data" });
  }
};

exports.getRetention = async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks, 10) || 8;
    const retention = analyticsEngine.getRetentionData(weeks);
    res.json({ retention });
  } catch (error) {
    logger.error("Get retention error", { error: error.message });
    res.status(500).json({ error: "Failed to get retention data" });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const events = usageTracker.getRecentEvents(limit);
    const topEvents = analyticsEngine.getTopEvents(20);

    res.json({ events, topEvents });
  } catch (error) {
    logger.error("Get events error", { error: error.message });
    res.status(500).json({ error: "Failed to get events" });
  }
};

exports.getRevenue = async (req, res) => {
  try {
    const billingService = require("../services/billing");
    const revenue = await billingService.getRevenueAnalytics();
    res.json(revenue);
  } catch (error) {
    logger.error("Get revenue error", { error: error.message });
    res.status(500).json({ error: "Failed to get revenue data" });
  }
};
