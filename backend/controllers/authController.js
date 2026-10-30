const User = require("../models/userModel");
const Chat = require("../models/chatModel");
const Generation = require("../models/generationModel");
const ProviderCredential = require("../models/providerCredentialModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const emailService = require("../services/emailService");
const { hashToken, makeTokens, setCookies, clearCookies } = require("../services/sessionService");
const emailFrom = (req) => typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
const validEmail = (email) => email.length <= 254 && /^\S+@\S+\.\S+$/.test(email);
const validPassword = (value) => typeof value === "string" && value.length >= 8 && Buffer.byteLength(value) <= 72;
const bad = (res, message) => res.status(400).json({ code: "INVALID_INPUT", message });
const mail = (req) => req.app.locals.services.email || emailService;
const closeSockets = (req, id) => req.app.locals.closeUserSockets?.(String(id));
const failed = (req, res, operation) => res.status(500).json({ code: "AUTH_UNAVAILABLE", message: "Unable to " + operation + ". Please try again.", requestId: req.requestId });
const publicUser = (user) => ({ id: String(user._id), email: user.email });
exports.register = async (req, res) => {
  const email = emailFrom(req);
  if (!validEmail(email) || !validPassword(req.body.password)) return bad(res, "Enter a valid email and a password of at least 8 characters (maximum 72 UTF-8 bytes).");
  try {
    if (await User.exists({ email })) return bad(res, "An account with this email already exists. Try signing in or resetting your password.");
    const token = jwt.sign({ email }, process.env.JWT_VERIFICATION_TOKEN, { expiresIn: "24h", jwtid: randomUUID() });
    await User.create({ email, password: req.body.password, verificationToken: hashToken(token), verificationTokenExpiry: Date.now() + 86400000 });
    let delivery = "sent";
    try { await mail(req).sendVerificationEmail(email, token); } catch { delivery = "failed"; }
    return res.status(201).json({ delivery, message: delivery === "sent" ? "Account created. Check your inbox to verify your email." : "Account created, but email delivery failed. Use Resend verification to try again." });
  } catch (error) { if (error.code === 11000) return bad(res, "An account with this email already exists."); return failed(req, res, "create your account"); }
};
exports.login = async (req, res) => {
  if (!validEmail(emailFrom(req)) || !validPassword(req.body.password)) return res.status(401).json({ code: "INVALID_CREDENTIALS", message: "Invalid email or password." });
  try {
    const user = await User.findOne({ email: emailFrom(req) });
    if (!user || !await bcrypt.compare(req.body.password, user.password)) return res.status(401).json({ code: "INVALID_CREDENTIALS", message: "Invalid email or password." });
    if (!user.isVerified) return res.status(403).json({ code: "EMAIL_NOT_VERIFIED", message: "Please verify your email before signing in.", needsVerification: true });
    // Single active device session: new sign-in invalidates the previous session.
    const updated = await User.findByIdAndUpdate(user._id, { $inc: { sessionVersion: 1 } }, { new: true });
    const tokens = makeTokens(updated);
    const write = await User.updateOne({ _id: updated._id, sessionVersion: updated.sessionVersion }, { $set: { refreshTokenHash: hashToken(tokens.refreshToken), refreshTokenExpiry: Date.now() + 7 * 86400000 } });
    if (!write.matchedCount) return res.status(409).json({ message: "Another sign-in completed. Please sign in again." });
    closeSockets(req, user._id); setCookies(res, tokens);
    return res.json({ user: publicUser(updated) });
  } catch { return failed(req, res, "sign in"); }
};
exports.checkAuth = (req, res) => res.json({ user: publicUser(req.authUser) });
exports.logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (typeof token === "string") {
      const user = await User.findOneAndUpdate({ refreshTokenHash: hashToken(token) }, { $inc: { sessionVersion: 1 }, $unset: { refreshTokenHash: "", refreshTokenExpiry: "" } });
      if (user) closeSockets(req, user._id);
    }
    clearCookies(res); return res.json({ message: "Signed out." });
  } catch { clearCookies(res); return failed(req, res, "end the session"); }
};
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (typeof token !== "string") throw new Error("Missing refresh token");
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_TOKEN);
    const user = await User.findOne({ _id: decoded.id, sessionVersion: decoded.version, isVerified: true });
    if (!user || !Number.isInteger(decoded.version)) throw new Error("Revoked");
    const tokens = makeTokens(user);
    const update = await User.updateOne({ _id: user._id, refreshTokenHash: hashToken(token), refreshTokenExpiry: { $gt: new Date() }, sessionVersion: decoded.version }, { $set: { refreshTokenHash: hashToken(tokens.refreshToken), refreshTokenExpiry: Date.now() + 7 * 86400000 } });
    if (!update.modifiedCount) {
      await User.updateOne({ _id: user._id, sessionVersion: decoded.version }, { $inc: { sessionVersion: 1 }, $unset: { refreshTokenHash: "", refreshTokenExpiry: "" } });
      closeSockets(req, user._id); throw new Error("Refresh token reused");
    }
    setCookies(res, tokens); return res.json({ user: publicUser(user), message: "Session renewed." });
  } catch { clearCookies(res); return res.status(401).json({ code: "SESSION_EXPIRED", message: "Your session has ended. Please sign in again." }); }
};
exports.verifyEmail = async (req, res) => {
  const token = req.query.token || req.body.token;
  if (typeof token !== "string" || token.length > 2000) return bad(res, "A valid verification token is required.");
  try {
    const decoded = jwt.verify(token, process.env.JWT_VERIFICATION_TOKEN);
    const user = await User.findOne({ email: decoded.email });
    if (user?.isVerified) return res.json({ verified: true, message: "Email already verified. You can sign in." });
    if (!user || user.verificationToken !== hashToken(token) || user.verificationTokenExpiry <= new Date()) return bad(res, "Invalid or expired verification link. Request a new email.");
    user.isVerified = true; user.verificationToken = undefined; user.verificationTokenExpiry = undefined; await user.save();
    return res.json({ verified: true, message: "Email verified. You can now sign in." });
  } catch { return bad(res, "Invalid or expired verification link. Request a new email."); }
};
exports.forgotPassword = async (req, res) => {
  const email = emailFrom(req);
  if (!validEmail(email)) return bad(res, "Enter a valid email address.");
  try {
    const user = await User.findOne({ email });
    if (user && (!user.recoveryRequestedAt || Date.now() - user.recoveryRequestedAt.getTime() >= 60000)) {
      const token = jwt.sign({ id: user._id, jti: randomUUID() }, process.env.JWT_RESET_TOKEN, { expiresIn: "1h" });
      user.resetToken = hashToken(token); user.resetTokenExpiry = Date.now() + 3600000; user.recoveryRequestedAt = new Date(); await user.save();
      try { await mail(req).sendPasswordResetEmail(email, token); } catch { /* Do not disclose delivery or account existence. */ }
    }
    return res.json({ message: "If an account exists, a password reset link has been requested. Check your inbox and spam folder." });
  } catch { return failed(req, res, "request a reset link"); }
};
exports.resetPassword = async (req, res) => {
  if (!validPassword(req.body.newPassword) || typeof req.body.token !== "string") return bad(res, "Use a valid reset link and a password of at least 8 characters (maximum 72 UTF-8 bytes).");
  try {
    const decoded = jwt.verify(req.body.token, process.env.JWT_RESET_TOKEN);
    const password = await bcrypt.hash(req.body.newPassword, 10);
    const user = await User.findOneAndUpdate({ _id: decoded.id, resetToken: hashToken(req.body.token), resetTokenExpiry: { $gt: new Date() } }, { $set: { password }, $inc: { sessionVersion: 1 }, $unset: { resetToken: "", resetTokenExpiry: "", refreshTokenHash: "", refreshTokenExpiry: "" } });
    if (!user) return bad(res, "Invalid or expired reset link.");
    closeSockets(req, user._id); clearCookies(res); return res.json({ message: "Password updated. Sign in with your new password." });
  } catch { return bad(res, "Invalid or expired reset link."); }
};
exports.resendVerification = async (req, res) => {
  const email = emailFrom(req);
  if (!validEmail(email)) return bad(res, "Enter a valid email address.");
  try {
    const user = await User.findOne({ email, isVerified: false });
    if (user && (!user.verificationRequestedAt || Date.now() - user.verificationRequestedAt.getTime() >= 60000)) {
      const token = jwt.sign({ email }, process.env.JWT_VERIFICATION_TOKEN, { expiresIn: "24h", jwtid: randomUUID() });
      user.verificationToken = hashToken(token); user.verificationTokenExpiry = Date.now() + 86400000; user.verificationRequestedAt = new Date(); await user.save();
      try { await mail(req).sendVerificationEmail(email, token); } catch { return res.status(503).json({ code: "EMAIL_UNAVAILABLE", message: "Email is unavailable. Please try again in a minute." }); }
    }
    return res.json({ message: "If verification is needed, an email has been requested. Wait a minute before trying again." });
  } catch { return failed(req, res, "request verification"); }
};
exports.exportData = async (req, res) => {
  try {
    const [user, chats] = await Promise.all([
      User.findById(req.user.id).select("email providerChoice answerStyle audienceProfile usePastChats createdAt").lean(),
      Chat.find({ userId: req.user.id }).lean(),
    ]);
    if (!user) return bad(res, "Account not found.");
    return res.json({
      exportedAt: new Date().toISOString(),
      account: {
        email: user.email,
        providerChoice: user.providerChoice,
        answerStyle: user.answerStyle,
        audienceProfile: user.audienceProfile,
        usePastChats: user.usePastChats,
        createdAt: user.createdAt,
      },
      conversations: chats.map((c) => ({
        sessionId: c.sessionId,
        title: c.title,
        isPinned: Boolean(c.isPinned),
        isMedical: c.isMedical,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messages: c.messages,
      })),
    });
  } catch { return failed(req, res, "export account data"); }
};
exports.deleteAccount = async (req, res) => {
  if (req.body.confirmation !== "DELETE") return bad(res, "Type DELETE to confirm permanent account deletion.");
  try {
    await User.updateOne({ _id: req.user.id }, { $inc: { sessionVersion: 1 }, $unset: { refreshTokenHash: "" } }); closeSockets(req, req.user.id);
    await Chat.deleteMany({ userId: req.user.id }); await Generation.deleteMany({ userId: req.user.id }); await ProviderCredential.deleteMany({ userId: req.user.id }); await User.deleteOne({ _id: req.user.id });
    clearCookies(res); return res.json({ message: "Account and active application data deleted. Backups follow the operator retention policy." });
  } catch { return failed(req, res, "delete the account"); }
};
