/**
 * ============================================================================
 * MEDASSIST AI - AUTHENTICATION ROUTER (authRoute.js)
 * ============================================================================
 * Role:
 *   Defines endpoint paths and rate-limiting policies for user authentication,
 *   email verification, token refreshing, and password recovery.
 *
 * Rate Limiting Policy:
 *   - Applies `authLimiter`: 30 requests per 15-minute sliding window across all
 *     auth endpoints to prevent brute-force attacks and credential stuffing.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: AUTHENTICATION ROUTE MAPPING
 * ----------------------------------------------------------------------------
 * [authRoute.js (Router: /api/auth)]
 *   │
 *   ├── [Rate Limiter Middleware: 30 requests / 15 minutes]
 *   │
 *   ├── POST /register             ──► authController.register
 *   ├── POST /login                ──► authController.login
 *   ├── GET  /check                ──► authController.checkAuth
 *   ├── POST /logout               ──► authController.logout
 *   ├── POST /refresh-token        ──► authController.refreshToken
 *   ├── POST /resend-verification  ──► authController.resendVerification
 *   ├── POST /forgot-password      ──► authController.forgotPassword
 *   ├── POST /reset-password       ──► authController.resetPassword
 *   ├── POST /verify-email         ──► authController.verifyEmail
 *   └── GET  /verify-email         ──► authController.verifyEmail
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: ROUTE DISPATCH & PROTECTION
 * ----------------------------------------------------------------------------
 *  Incoming Request to /api/auth/*
 *                 │
 *                 ▼
 *  ┌──────────────────────────────────────────────┐
 *  │ authLimiter (max 30 requests / 15 minutes)   │
 *  └──────────────────────────────────────────────┘
 *                 │ [Within limit]
 *                 ▼
 *  ┌──────────────────────────────────────────────┐
 *  │ Dispatch to matched authController handler   │
 *  └──────────────────────────────────────────────┘
 * ============================================================================
 */
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

router.use(authLimiter);

router.post("/register", authController.register);

router.post("/login", authController.login);

router.get("/check", authController.checkAuth);

router.post("/logout", authController.logout);

router.post("/refresh-token", authController.refreshToken);

router.post("/resend-verification", authController.resendVerification);

router.post("/forgot-password", authController.forgotPassword);

router.post("/reset-password", authController.resetPassword);

router.post("/verify-email", authController.verifyEmail);

router.get("/verify-email", authController.verifyEmail);

module.exports = router;
