const WebSocket = require("ws");
const cookie = require("cookie");
const { authenticate } = require("./sessionService");
const User = require("../models/userModel");
function attachWebSockets(server, app) {
  const wss = new WebSocket.Server({ noServer: true, maxPayload: 1024, perMessageDeflate: false });
  let upgrading = 0;
  server.on("upgrade", async (req, socket, head) => {
    const reject = (status = 401) => { if (!socket.destroyed) { socket.write("HTTP/1.1 " + status + " Rejected\r\nConnection: close\r\n\r\n"); socket.destroy(); } };
    if (req.url !== "/ws" || !app.locals.allowedOrigins.includes(req.headers.origin) || upgrading >= 50) return reject(403);
    upgrading++;
    try {
      const { user, expiresAt } = await authenticate(cookie.parse(req.headers.cookie || "").accessToken);
      if ([...wss.clients].filter((client) => client.userId === String(user._id)).length >= 5) return reject(429);
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.userId = String(user._id); ws.version = user.sessionVersion; ws.isAlive = true;
        const expiry = setTimeout(() => ws.close(4001, "Session expired"), Math.max(0, expiresAt - Date.now()));
        ws.on("pong", () => { ws.isAlive = true; });
        ws.on("message", () => ws.close(1003, "Client messages are not supported"));
        ws.on("error", () => {}); ws.on("close", () => clearTimeout(expiry));
        wss.emit("connection", ws, req);
      });
    } catch { reject(); } finally { upgrading--; }
  });
  const timer = setInterval(async () => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      try {
        if (!await User.exists({ _id: ws.userId, sessionVersion: ws.version, isVerified: true })) { ws.close(4001, "Session revoked"); continue; }
        ws.isAlive = false; ws.ping();
      } catch { ws.close(1011, "Session check unavailable"); }
    }
  }, 30000);
  app.locals.closeUserSockets = (userId) => { for (const ws of wss.clients) if (ws.userId === String(userId)) ws.close(4001, "Session changed"); };
  app.locals.broadcastUpdate = async (data, userId) => {
    for (const ws of wss.clients) {
      if (ws.userId !== String(userId) || ws.readyState !== WebSocket.OPEN) continue;
      try {
        if (!await User.exists({ _id: ws.userId, sessionVersion: ws.version, isVerified: true })) { ws.close(4001, "Session revoked"); continue; }
        if (ws.bufferedAmount > 1024 * 1024) { ws.close(1013, "Slow connection"); continue; }
        ws.send(JSON.stringify({ type: "CHAT_UPDATE", data, timestamp: new Date().toISOString() }));
      } catch { ws.close(1011, "Update unavailable"); }
    }
  };
  wss.on("close", () => clearInterval(timer));
  return wss;
}
module.exports = { attachWebSockets };
