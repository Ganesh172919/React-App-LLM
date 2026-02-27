const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authenticateToken = require("../middleware/authToken");
const { requirePermission } = require("../middleware/rbac");

router.get("/health", adminController.getSystemHealth);

router.get(
  "/stats",
  authenticateToken,
  requirePermission("admin:read"),
  adminController.getSystemStats
);
router.get(
  "/users",
  authenticateToken,
  requirePermission("admin:read", "users:manage"),
  adminController.listUsers
);
router.get(
  "/feature-flags",
  authenticateToken,
  requirePermission("admin:read"),
  adminController.getFeatureFlags
);
router.put(
  "/feature-flags/:flagName",
  authenticateToken,
  requirePermission("admin:write", "system:configure"),
  adminController.updateFeatureFlag
);
router.get(
  "/audit-logs",
  authenticateToken,
  requirePermission("admin:read"),
  adminController.getAuditLogs
);
router.get(
  "/queue",
  authenticateToken,
  requirePermission("admin:read"),
  adminController.getQueueStatus
);

module.exports = router;
