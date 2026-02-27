const express = require("express");
const router = express.Router();
const agentController = require("../controllers/agentController");
const authenticateToken = require("../middleware/authToken");
const { requireFeature } = require("../middleware/rbac");
const { validate, commonSchemas } = require("../middleware/validation");

router.get("/capabilities", authenticateToken, agentController.getCapabilities);
router.post(
  "/plan",
  authenticateToken,
  requireFeature("agent_system"),
  validate(commonSchemas.agentPlan),
  agentController.createPlan
);
router.post(
  "/execute",
  authenticateToken,
  requireFeature("agent_system"),
  agentController.executePlan
);
router.get("/task/:taskId", authenticateToken, agentController.getTaskStatus);

module.exports = router;
