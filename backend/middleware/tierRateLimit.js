const billingService = require("../services/billing");
const { getRateLimitConfig } = require("../config");
const { logger } = require("../services/logger");

const rateLimitStore = new Map();

function tierRateLimit(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return next();

  billingService
    .getSubscription(userId)
    .then((subscription) => {
      const tier = subscription?.tier || "free";
      const config = getRateLimitConfig(tier);

      const key = `${userId}:${tier}`;
      const now = Date.now();

      let entry = rateLimitStore.get(key);
      if (!entry || now - entry.windowStart > config.windowMs) {
        entry = { windowStart: now, count: 0 };
        rateLimitStore.set(key, entry);
      }

      entry.count++;

      res.setHeader("X-RateLimit-Limit", config.max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, config.max - entry.count));
      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil((entry.windowStart + config.windowMs) / 1000)
      );
      res.setHeader("X-RateLimit-Tier", tier);

      if (entry.count > config.max) {
        logger.warn("Rate limit exceeded", { userId, tier, count: entry.count });
        return res.status(429).json({
          error: "Rate limit exceeded",
          tier,
          limit: config.max,
          retryAfter: Math.ceil(
            (entry.windowStart + config.windowMs - now) / 1000
          ),
          upgradeUrl: "/api/subscription/upgrade",
        });
      }

      next();
    })
    .catch((error) => {
      logger.error("Rate limit middleware error", { error: error.message });
      next();
    });
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.windowStart > 30 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

module.exports = tierRateLimit;
