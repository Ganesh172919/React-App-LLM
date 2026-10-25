/**
 * ============================================================================
 * MEDASSIST AI - GENERAL AI ROUTER (aiRoute.js)
 * ============================================================================
 * Role:
 *   Exposes the authenticated general chat endpoint. Note that upstream
 *   in `app.js`, this router is mounted behind `aiLimiter` (20 req / 60s).
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: GENERAL AI ROUTE
 * ----------------------------------------------------------------------------
 * [aiRoute.js (Router: /api/ai)]
 *   │
 *   └── POST /chat ──► authenticateToken ──► aiController.handleChat
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: ROUTE EXECUTION
 * ----------------------------------------------------------------------------
 *  Client Request ──► [aiLimiter (app.js)] ──► authenticateToken ──► aiController.handleChat
 * ============================================================================
 */
const express = require("express");
const authenticateToken = require("../middleware/authToken");
const aiController = require("../controllers/aiController");

const router = express.Router();

router.post("/chat", authenticateToken, aiController.handleChat);

module.exports = router;
