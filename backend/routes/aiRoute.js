const express = require("express");
const authenticateToken = require("../middleware/authToken");
const aiController = require("../controllers/aiController");

const router = express.Router();

router.post("/chat", authenticateToken, aiController.handleChat);

module.exports = router;
