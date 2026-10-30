const { authenticate } = require("../services/sessionService");
module.exports = async (req, res, next) => {
  try {
    const { user } = await authenticate(req.cookies.accessToken);
    req.user = { id: String(user._id), version: user.sessionVersion }; req.authUser = user; next();
  } catch (error) {
    return res.status(401).json({ code: error.name === "TokenExpiredError" ? "ACCESS_EXPIRED" : "AUTH_REQUIRED", message: "Please sign in to continue.", requestId: req.requestId });
  }
};
