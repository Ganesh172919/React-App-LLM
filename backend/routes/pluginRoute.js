const express = require("express");
const router = express.Router();
const pluginController = require("../controllers/pluginController");
const authenticateToken = require("../middleware/authToken");
const { requireFeature } = require("../middleware/rbac");

router.get("/marketplace", authenticateToken, pluginController.listPlugins);
router.get("/marketplace/:slug", authenticateToken, pluginController.getPlugin);
router.get("/installed", authenticateToken, pluginController.getInstalledPlugins);
router.post(
  "/install/:slug",
  authenticateToken,
  requireFeature("plugin_system"),
  pluginController.installPlugin
);
router.post(
  "/uninstall/:slug",
  authenticateToken,
  pluginController.uninstallPlugin
);

module.exports = router;
