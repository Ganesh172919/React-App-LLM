// Built-output local QA server. Never imported by production.
const path = require("path");
const fs = require("fs");
const { randomBytes } = require("crypto");
const root = path.resolve(__dirname, "..");
const requireBackend = require("module").createRequire(path.join(root, "backend/package.json"));
const express = requireBackend("express");
const mongoose = requireBackend("mongoose");
const { MongoMemoryServer } = requireBackend("mongodb-memory-server");
async function main() {
  const fixtures = process.argv.includes("--fixtures");
  const origin = "http://127.0.0.1:4173";
  if (!fs.existsSync(path.join(root, "frontend/dist/index.html"))) throw new Error("Run npm --prefix frontend run build first.");
  process.env.NODE_ENV = "development"; process.env.COOKIE_SECURE = "false"; process.env.CLIENT_ORIGIN = origin;
  for (const key of ["JWT_ACCESS_TOKEN", "JWT_REFRESH_TOKEN", "JWT_RESET_TOKEN", "JWT_VERIFICATION_TOKEN"]) process.env[key] = randomBytes(32).toString("hex");
  process.env.USER_API_KEY_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  const mongo = await MongoMemoryServer.create({ binary: { version: "7.0.24" }, instance: { launchTimeout: 30000 } });
  await mongoose.connect(mongo.getUri());
  const User = requireBackend("./models/userModel");
  await Promise.all([User.init(), requireBackend("./models/chatModel").init(), requireBackend("./models/generationModel").init(), requireBackend("./models/providerCredentialModel").init()]);
  await User.create({ email: "student@example.test", password: "Student-demo-123", isVerified: true });
  const mailbox = [];
  const deliver = (kind) => async (to, token) => mailbox.push({ to, kind, link: (kind === "verify" ? "/verify-email?token=" : "/reset-password?token=") + encodeURIComponent(token) });
  const services = fixtures ? {
    email: { sendVerificationEmail: deliver("verify"), sendPasswordResetEmail: deliver("reset") },
    generate: async ({ prompt, history = [] }) => {
      if (prompt.includes("provider outage")) throw new Error("Synthetic provider outage");
      if (prompt.includes("slow response")) await new Promise((resolve) => setTimeout(resolve, 1200));
      return { text: prompt.includes("ABSTRACT:") ? "This is a synthetic educational test answer [1]. Review the linked source with a qualified clinician. This checks the chat workflow, not clinical accuracy." : "This is a synthetic general answer for browser testing. Previous session turns: " + history.length + ".", model: "built-browser-fixture" };
    },
    fetchSources: async (prompt) => {
      if (prompt.includes("literature unavailable")) throw new Error("Synthetic literature outage");
      if (prompt.includes("no results")) return [];
      return [{ title: "Synthetic PubMed record for browser workflow testing", pmid: "123", url: "https://pubmed.ncbi.nlm.nih.gov/123/", journal: "QA fixture", pubdate: "2026", abstract: prompt.includes("metadata only") ? "" : "Synthetic abstract used only for software testing." }];
    },
  } : {};
  const api = requireBackend("./app").createApp({ services });
  const gateway = express();
  let failSave = process.argv.includes("--fail-save-once");
  gateway.use((req, res, next) => { if (failSave && req.method === "POST" && req.path === "/api/save") { failSave = false; return res.status(503).json({ code: "TEST_SAVE_OUTAGE", message: "Synthetic one-time save failure. Retry saving the completed answer." }); } next(); });
  if (fixtures) gateway.get("/_test/mailbox", (req, res) => {
    const escape = (value) => String(value).replace(/[&<>"']/g, (letter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[letter]);
    res.type("html").send('<!doctype html><title>Local QA inbox</title><h1>Local QA inbox</h1><p>Synthetic accounts only. This route exists only in this local QA runner.</p><ul>' + mailbox.map((item) => '<li>' + escape(item.to) + ': <a href="' + escape(item.link) + '">' + (item.kind === "verify" ? "Verify email" : "Open reset form") + '</a></li>').join("") + "</ul>");
  });
  gateway.use((req, res, next) => req.path.startsWith("/api/") ? api(req, res, next) : next());
  gateway.use(express.static(path.join(root, "frontend/dist"), { index: false, setHeaders(res, file) { res.set("Cache-Control", file.includes(path.sep + "assets" + path.sep) ? "public,max-age=31536000,immutable" : "no-cache"); } }));
  gateway.get(/\.[a-z0-9]+$/i, (req, res) => res.status(404).send("Asset not found"));
  gateway.get("*", (req, res) => res.sendFile(path.join(root, "frontend/dist/index.html")));
  const server = require("http").createServer(gateway);
  const sockets = requireBackend("./services/websocketService").attachWebSockets(server, api);
  server.listen(4173, "127.0.0.1", () => console.log("Production build QA: " + origin + " | " + (fixtures ? "synthetic providers and local inbox" : "live PubMed") + " | student@example.test / Student-demo-123"));
  const stop = async () => { for (const socket of sockets.clients) socket.terminate(); sockets.close(); server.close(); await mongoose.disconnect(); await mongo.stop(); process.exit(0); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
}
main().catch((error) => { console.error(error.message); process.exit(1); });
