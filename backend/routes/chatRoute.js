/**
 * ============================================================================
 * MEDASSIST AI - CHAT & CONVERSATION ROUTER (chatRoute.js)
 * ============================================================================
 * Role:
 *   Registers endpoints for saving messages, fetching session history,
 *   renaming chats, and deleting user-owned conversations. All endpoints
 *   are secured via JWT authentication middleware (`authenticateToken`).
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: CHAT ROUTE DISPATCH
 * ----------------------------------------------------------------------------
 * [chatRoute.js (Router: /api)]
 *   │
 *   ├── POST   /save             ──► authenticateToken ──► chatController.saveChat
 *   ├── GET    /history          ──► authenticateToken ──► chatController.getHistory
 *   ├── DELETE /delete           ──► authenticateToken ──► chatController.deleteChat (body sessionId)
 *   ├── PATCH  /chats/:sessionId ──► authenticateToken ──► chatController.updateChat (rename)
 *   └── DELETE /chats/:sessionId ──► authenticateToken ──► chatController.deleteChat (REST param)
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: CONVERSATION ENDPOINT SECURITY
 * ----------------------------------------------------------------------------
 *  Incoming Request to /api/save | /api/history | /api/chats/:id
 *                 │
 *                 ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ authenticateToken Middleware (validates accessToken)   │
 *  └────────────────────────────────────────────────────────┘
 *                 │ [Authenticated: req.user.id populated]
 *                 ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ chatController handler execution with user scoping     │
 *  └────────────────────────────────────────────────────────┘
 * ============================================================================
 */
const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authenticateToken = require("../middleware/authToken");

router.post("/save", authenticateToken, chatController.saveChat);
router.get("/history", authenticateToken, chatController.getHistory);
router.delete("/delete", authenticateToken, chatController.deleteChat);
router.patch("/chats/:sessionId", authenticateToken, chatController.updateChat);
router.delete("/chats/:sessionId", authenticateToken, chatController.deleteChat);

module.exports = router;
