const { OAuth2Client } = require("google-auth-library");
const { randomBytes, createHash, timingSafeEqual } = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { hashToken, makeTokens, setCookies, cookieOptions } = require("../services/sessionService");

const configured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL);
const cookieSettings = () => ({ ...cookieOptions(), sameSite: "lax", path: "/api/auth/google", maxAge: 10 * 60000 });
const frontend = () => process.env.CLIENT_ORIGIN.split(",")[0].trim();
const client = () => new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_CALLBACK_URL);
const exchange = async ({ code, verifier }) => {
  const oauth = client();
  const { tokens } = await oauth.getToken({ code, codeVerifier: verifier });
  if (!tokens.id_token) throw new Error("Missing ID token");
  const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
  return ticket.getPayload();
};
exports.status = (req, res) => res.json({ google: configured() });
exports.start = (req, res) => {
  if (!configured()) return res.status(503).json({ code: "OAUTH_UNAVAILABLE", message: "Google sign-in is not configured." });
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const transaction = jwt.sign({ state, verifier }, process.env.JWT_VERIFICATION_TOKEN, { expiresIn: "10m", audience: "google-oauth" });
  res.cookie("oauthTransaction", transaction, cookieSettings());
  return res.redirect(client().generateAuthUrl({ scope: ["openid", "email"], state, code_challenge: challenge, code_challenge_method: "S256" }));
};
exports.callback = async (req, res) => {
  const { maxAge, ...clearOptions } = cookieSettings();
  res.clearCookie("oauthTransaction", clearOptions);
  const fail = () => res.redirect(frontend() + "/login?oauth=failed");
  try {
    if (!configured() || typeof req.query.code !== "string" || typeof req.query.state !== "string") return fail();
    const transaction = jwt.verify(req.cookies.oauthTransaction || "", process.env.JWT_VERIFICATION_TOKEN, { audience: "google-oauth" });
    const expected = Buffer.from(transaction.state); const received = Buffer.from(req.query.state);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return fail();
    const identity = await (req.app.locals.services.googleExchange || exchange)({ code: req.query.code, verifier: transaction.verifier });
    if (!identity?.sub || !identity.email_verified || typeof identity.email !== "string") return fail();
    const email = identity.email.trim().toLowerCase();
    if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) return fail();
    let user = await User.findOne({ googleSubject: identity.sub });
    if (!user) {
      // Never silently link an OAuth identity to an existing password account.
      if (await User.exists({ email })) return fail();
      user = await User.create({ email, googleSubject: identity.sub, password: randomBytes(32).toString("hex"), isVerified: true });
    }
    user = await User.findByIdAndUpdate(user._id, { $inc: { sessionVersion: 1 } }, { new: true });
    const tokens = makeTokens(user);
    const written = await User.updateOne({ _id: user._id, sessionVersion: user.sessionVersion }, { $set: { refreshTokenHash: hashToken(tokens.refreshToken), refreshTokenExpiry: Date.now() + 7 * 86400000 } });
    if (!written.matchedCount) return fail();
    req.app.locals.closeUserSockets?.(String(user._id)); setCookies(res, tokens);
    return res.redirect(frontend() + "/chat");
  } catch { return fail(); }
};
