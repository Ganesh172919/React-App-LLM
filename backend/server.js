/**
 * ============================================================================
 * MEDASSIST AI - HTTP & WEBSOCKET SERVER (server.js)
 * ============================================================================
 * Role:
 *   Primary application entrypoint binding the Express HTTP application and
 *   WebSocket Server (ws) to a single network port. Manages real-time event
 *   broadcasting, connection lifecycle, JWT-authenticated WebSocket handshakes,
 *   periodic heartbeat monitoring, and graceful process termination.
 *
 * Architecture Highlights:
 *   - Shares single HTTP port between Express API and WebSocket endpoints (/ws).
 *   - User-scoped broadcasts: pushes CHAT_UPDATE events strictly to sockets
 *     bearing the authenticated recipient's user ID (prevents cross-tenant leak).
 *   - Heartbeat watchdog: 30-second interval pings dead sockets to terminate them.
 *   - Graceful termination: handles SIGTERM / SIGINT signals with active client
 *     eviction and socket cleanup before process exit.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: SERVER INITIALIZATION & WEBSOCKET LIFECYCLE
 * ----------------------------------------------------------------------------
 * [server.js Entrypoint]
 *   │
 *   ├── 1. HTTP Server Setup
 *   │     ├── Imports app (Express app instance)
 *   │     ├── Initializes http.createServer(app)
 *   │     └── Resolves PORT from process.env.PORT || 5000
 *   │
 *   ├── 2. WebSocket Server Initialization
 *   │     ├── Instantiates WebSocket.Server on path: "/ws"
 *   │     ├── Configures security limits: maxPayload 1024 bytes, perMessageDeflate: false
 *   │     └── Enables clientTracking for user connection index
 *   │
 *   ├── 3. Connection Authentication Flow
 *   │     ├── Checks Origin header against app.locals.allowedOrigins
 *   │     ├── Parses HTTP cookies for accessToken
 *   │     ├── Verifies JWT via process.env.JWT_ACCESS_TOKEN
 *   │     ├── On Success: Attaches ws.userId = decoded.id, marks ws.isAlive = true
 *   │     └── On Failure: Closes socket immediately with 1008 (Unauthorized)
 *   │
 *   ├── 4. Heartbeat Watchdog
 *   │     ├── Runs every 30,000ms (30s)
 *   │     ├── Terminates clients where isAlive === false
 *   │     ├── Sets isAlive = false and emits ping()
 *   │     └── Restores isAlive = true upon receiving 'pong'
 *   │
 *   ├── 5. User-Scoped Broadcast Utility (app.locals.broadcastUpdate)
 *   │     ├── Receives (payloadData, targetUserId)
 *   │     ├── Scans all connected wss.clients
 *   │     ├── Filters clients where client.readyState === OPEN && client.userId === targetUserId
 *   │     └── Dispatches JSON payload: { type: "CHAT_UPDATE", data, timestamp }
 *   │
 *   └── 6. Graceful Shutdown Handler
 *         ├── Intercepts SIGTERM and SIGINT
 *         ├── Closes all connected WebSocket clients (1001)
 *         ├── Tears down WebSocket Server and terminates HTTP server
 *         └── Sets 10-second hard fallback before process.exit(1)
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: WEBSOCKET AUTHENTICATION & BROADCAST SEQUENCE
 * ----------------------------------------------------------------------------
 * Client Browser                 HTTP/WS Server                    Mongoose / API
 *       │                              │                                 │
 *   [1] │─── Upgrade: websocket ──────>│                                 │
 *       │    Cookie: accessToken=JWT   │                                 │
 *       │    Origin: http://client     │                                 │
 *       │                              ├─ Check Origin against whitelist │
 *       │                              ├─ jwt.verify(accessToken)        │
 *       │                              ├─ Set ws.userId = decoded.id     │
 *       │<── 101 Switching Protocols ──┤                                 │
 *       │    (Connection OPEN)         │                                 │
 *       │                              │                                 │
 *       │      [Heartbeat Loop]        │                                 │
 *       │<── ping() (every 30s) ───────┤                                 │
 *       │─── pong() ──────────────────>│ (ws.isAlive = true)             │
 *       │                              │                                 │
 *       │      [Chat Update Event]     │                                 │
 *       │                              │<── POST /api/save ──────────────┤
 *       │                              │    broadcastUpdate(data, userId)│
 *       │                              ├─ Filter: ws.userId == userId    │
 *       │<── CHAT_UPDATE JSON ─────────┤                                 │
 *       │                              │                                 │
 * ============================================================================
 */
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
  maxPayload: 1024,
  perMessageDeflate: false,
});

const connectionInterval = 30000;

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, connectionInterval);

wss.on("connection", (ws, req) => {
  try {
    const origin = req.headers.origin;
    if (origin && !app.locals.allowedOrigins.includes(origin)) {
      throw new Error("Origin is not allowed");
    }
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.accessToken;

    if (!token) {
      throw new Error("No access token provided");
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN);
    ws.userId = decoded.id;
  } catch (error) {
    return ws.close(1008, "Unauthorized");
  }

  ws.isAlive = true;

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", () => {
    ws.close(1003, "Client messages are not supported");
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error for user ${ws.userId}:`, error);
  });

  ws.on("close", () => {});
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

let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received - shutting down gracefully`);

  wss.clients.forEach((client) => {
    client.close(1001, "Server shutting down");
  });

  wss.close(() => {
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = server;
