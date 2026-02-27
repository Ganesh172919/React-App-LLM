const express = require("express");
const router = express.Router();
const apiKeyController = require("../controllers/apiKeyController");
const authenticateToken = require("../middleware/authToken");
const { requireFeature } = require("../middleware/rbac");
const { validate, commonSchemas } = require("../middleware/validation");

router.post(
  "/",
  authenticateToken,
  requireFeature("api_access"),
  validate(commonSchemas.createApiKey),
  apiKeyController.createKey
);
router.get("/", authenticateToken, apiKeyController.listKeys);
router.delete("/:keyId", authenticateToken, apiKeyController.revokeKey);
router.put(
  "/:keyId/permissions",
  authenticateToken,
  apiKeyController.updatePermissions
);

module.exports = router;
