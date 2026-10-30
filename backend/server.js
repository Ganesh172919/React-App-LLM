require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const mongoose = require("mongoose");
const http = require("http");
const { validateConfig } = require("./services/config");
const { attachWebSockets } = require("./services/websocketService");
const app = require("./app");
async function start() {
  validateConfig();
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await Promise.all([require("./models/userModel").init(), require("./models/chatModel").init(), require("./models/generationModel").init()]);
  const server = http.createServer(app); const wss = attachWebSockets(server, app);
  server.listen(process.env.PORT || 5000, () => console.log("MedAssist API ready on port " + (process.env.PORT || 5000)));
  let closing = false;
  const shutdown = () => {
    if (closing) return; closing = true;
    for (const socket of wss.clients) socket.close(1001, "Server restarting");
    const deadline = setTimeout(() => process.exit(1), 10000).unref();
    wss.close(() => server.close(async () => { await mongoose.disconnect(); clearTimeout(deadline); process.exit(0); }));
  };
  process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
  return server;
}
if (require.main === module) start().catch((error) => { console.error("Startup failed:", error.message); process.exitCode = 1; });
module.exports = { start };
