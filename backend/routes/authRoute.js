const router = require("express").Router();
const controller = require("../controllers/authController");
const auth = require("../middleware/authToken");
const oauth = require("../controllers/oauthController");
const limit = (name) => (req, res, next) => req.app.locals[name](req, res, next);
const allowedFields = { "/register": ["email", "password"], "/login": ["email", "password"], "/resend-verification": ["email"], "/forgot-password": ["email"], "/reset-password": ["token", "newPassword"], "/verify-email": ["token"], "/account": ["confirmation"], "/logout": [], "/refresh-token": [], "/export-data": [] };
router.use((req, res, next) => {
  try { if (allowedFields[req.path]) require("../services/validation").keys(req.body || {}, allowedFields[req.path]); next(); } catch (error) { next(error); }
});
router.post("/register", limit("authLimiter"), controller.register);
router.get("/providers", oauth.status);
router.get("/google", limit("authLimiter"), oauth.start);
router.get("/google/callback", limit("authLimiter"), oauth.callback);
router.post("/login", limit("authLimiter"), controller.login);
router.get("/check", auth, controller.checkAuth);
router.post("/logout", controller.logout);
router.post("/refresh-token", controller.refreshToken);
router.get("/export-data", auth, controller.exportData);
router.post("/resend-verification", limit("recoveryLimiter"), controller.resendVerification);
router.post("/forgot-password", limit("recoveryLimiter"), controller.forgotPassword);
router.post("/reset-password", limit("authLimiter"), controller.resetPassword);
router.post("/verify-email", limit("authLimiter"), controller.verifyEmail);
router.get("/verify-email", limit("authLimiter"), controller.verifyEmail);
router.delete("/account", auth, controller.deleteAccount);
module.exports = router;
