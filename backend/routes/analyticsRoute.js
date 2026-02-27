const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const authenticateToken = require("../middleware/authToken");
const { requireFeature, requireTier } = require("../middleware/rbac");

router.get("/user", authenticateToken, analyticsController.getUserAnalytics);
router.get(
  "/dashboard",
  authenticateToken,
  requireFeature("analytics_dashboard"),
  analyticsController.getDashboard
);
router.get(
  "/funnels/:funnelName?",
  authenticateToken,
  requireTier("pro", "enterprise"),
  analyticsController.getFunnels
);
router.get(
  "/retention",
  authenticateToken,
  requireTier("pro", "enterprise"),
  analyticsController.getRetention
);
router.get(
  "/events",
  authenticateToken,
  requireTier("enterprise"),
  analyticsController.getEvents
);
router.get(
  "/revenue",
  authenticateToken,
  requireTier("enterprise"),
  analyticsController.getRevenue
);

module.exports = router;
