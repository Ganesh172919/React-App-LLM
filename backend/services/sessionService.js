const jwt = require("jsonwebtoken");
const { createHash, randomUUID } = require("crypto");
const User = require("../models/userModel");
const hashToken = (value) => createHash("sha256").update(value).digest("hex");
const cookieOptions = () => ({ httpOnly: true, secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production", sameSite: "strict", path: "/" });
const makeTokens = (user) => {
  const claims = { id: String(user._id), version: user.sessionVersion };
  return {
    accessToken: jwt.sign(claims, process.env.JWT_ACCESS_TOKEN, { expiresIn: "15m" }),
    refreshToken: jwt.sign({ ...claims, jti: randomUUID() }, process.env.JWT_REFRESH_TOKEN, { expiresIn: "7d" }),
  };
};
const setCookies = (res, tokens) => {
  res.cookie("accessToken", tokens.accessToken, { ...cookieOptions(), maxAge: 15 * 60000 });
  res.cookie("refreshToken", tokens.refreshToken, { ...cookieOptions(), maxAge: 7 * 86400000 });
};
const clearCookies = (res) => { res.clearCookie("accessToken", cookieOptions()); res.clearCookie("refreshToken", cookieOptions()); };
const authenticate = async (token) => {
  const decoded = jwt.verify(token || "", process.env.JWT_ACCESS_TOKEN);
  if (!Number.isInteger(decoded.version)) throw new Error("Legacy session expired");
  const user = await User.findOne({ _id: decoded.id, sessionVersion: decoded.version, isVerified: true });
  if (!user) throw new Error("Session revoked");
  return { user, expiresAt: decoded.exp * 1000 };
};
module.exports = { hashToken, cookieOptions, makeTokens, setCookies, clearCookies, authenticate };
