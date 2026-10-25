/**
 * ============================================================================
 * MEDASSIST AI - MEDICAL ROUTER (medicalRoute.js)
 * ============================================================================
 * Role:
 *   Exposes the authenticated grounded medical query endpoint. Mounted
 *   in `app.js` with `aiLimiter` (20 req / 60s) to protect both external
 *   PubMed E-Utilities and Gemini AI quotas.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: MEDICAL ROUTE
 * ----------------------------------------------------------------------------
 * [medicalRoute.js (Router: /api/medical)]
 *   │
 *   └── POST / ──► authenticateToken ──► medicalController.handleMedicalQuery
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: ROUTE EXECUTION
 * ----------------------------------------------------------------------------
 *  Client Request ──► [aiLimiter (app.js)] ──► authenticateToken ──► medicalController
 * ============================================================================
 */
const express = require("express");
const router = express.Router();
const medicalController = require("../controllers/medicalController");
const authenticateToken = require("../middleware/authToken");

router.post("/", authenticateToken, medicalController.handleMedicalQuery);

module.exports = router;
