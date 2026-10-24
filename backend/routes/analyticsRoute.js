const express = require("express");
const authenticateToken = require("../middleware/authToken");
const analyticsController = require("../controllers/analyticsController");

const router = express.Router();

router.get("/overview", authenticateToken, analyticsController.getOverview);

module.exports = router;
