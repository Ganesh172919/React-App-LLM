const app = require("./app");
const http = require("http");
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const wss = new WebSocket.Server({
  server,
  path: "/ws", 
  clientTracking: true,
});

// Connection Management
const activeConnections = new Set();
const connectionInterval = 30000; 

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log("Terminating inactive connection");
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, connectionInterval);

wss.on("connection", (ws, req) => {
  console.log("New WebSocket connection attempt");

  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.accessToken;

    if (!token) {
      throw new Error("No access token provided");
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN);
    ws.userId = decoded.id; 
    console.log(`Authenticated connection for user ${decoded.id}`);
  } catch (error) {
    console.log("WebSocket auth failed:", error.message);
    return ws.close(1008, "Unauthorized");
  }

  ws.isAlive = true;
  activeConnections.add(ws);

  ws.on("pong", () => {
    ws.isAlive = true;
    console.log("Received pong from client");
  });

  ws.on("message", (message) => {
    console.log(`Received message from ${ws.userId}:`, message);
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error for user ${ws.userId}:`, error);
  });

  ws.on("close", () => {
    console.log(`Connection closed for user ${ws.userId}`);
    activeConnections.delete(ws);
  });
});

wss.on("close", () => {
  clearInterval(interval);
  console.log("WebSocket server closed");
});

// Broadcast only to sockets that belong to the affected user.
app.locals.broadcastUpdate = (data, userId) => {
  const targetUserId = String(userId || "");

  wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      String(client.userId) === targetUserId
    ) {
      try {
        client.send(
          JSON.stringify({
            type: "CHAT_UPDATE",
            data,
            timestamp: new Date().toISOString(),
          })
        );
      } catch (error) {
        console.error("Broadcast error:", error);
      }
    }
  });
};

server.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received - shutting down gracefully");

  wss.clients.forEach((client) => {
    client.close(1001, "Server shutting down");
  });

  wss.close(() => {
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
});

module.exports = server;
