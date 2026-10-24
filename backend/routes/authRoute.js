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
