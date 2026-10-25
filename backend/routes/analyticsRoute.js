/**
 * ============================================================================
 * MEDASSIST AI - ANALYTICS ROUTER (analyticsRoute.js)
 * ============================================================================
 * Role:
 *   Exposes the authenticated analytics endpoint for reporting usage trends,
 *   verification outcomes, and dataset health signals to the dashboard.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: ANALYTICS ROUTE
 * ----------------------------------------------------------------------------
 * [analyticsRoute.js (Router: /api/analytics)]
 *   │
 *   └── GET /overview ──► authenticateToken ──► analyticsController.getOverview
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: ROUTE DISPATCH
 * ----------------------------------------------------------------------------
 *  Dashboard Client ──► authenticateToken ──► analyticsController.getOverview
 * ============================================================================
 */
const express = require("express");
const authenticateToken = require("../middleware/authToken");
const analyticsController = require("../controllers/analyticsController");

const router = express.Router();

router.get("/overview", authenticateToken, analyticsController.getOverview);

module.exports = router;
