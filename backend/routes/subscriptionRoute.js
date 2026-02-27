const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const authenticateToken = require("../middleware/authToken");
const { validate, commonSchemas } = require("../middleware/validation");

router.get("/", authenticateToken, subscriptionController.getSubscription);
router.post(
  "/upgrade",
  authenticateToken,
  validate(commonSchemas.subscriptionUpgrade),
  subscriptionController.upgrade
);
router.post("/downgrade", authenticateToken, subscriptionController.downgrade);
router.post("/cancel", authenticateToken, subscriptionController.cancel);
router.post("/reactivate", authenticateToken, subscriptionController.reactivate);
router.get("/history", authenticateToken, subscriptionController.getHistory);

module.exports = router;
