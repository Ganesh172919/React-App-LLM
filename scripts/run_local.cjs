// Local test/demo runner. Never imported by production. All accounts/data are synthetic.
const path = require("path");
const { randomBytes } = require("crypto");
const fs = require("fs");
const root = path.resolve(__dirname, "..");
const requireBackend = require("module").createRequire(path.join(root, "backend/package.json"));
const { MongoMemoryServer } = requireBackend("mongodb-memory-server");
const mongoose = requireBackend("mongoose");
async function main() {
  process.env.NODE_ENV = "development"; process.env.COOKIE_SECURE = "false";
  process.env.CLIENT_ORIGIN = "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://127.0.0.1:5175";
  for (const key of ["JWT_ACCESS_TOKEN", "JWT_REFRESH_TOKEN", "JWT_RESET_TOKEN", "JWT_VERIFICATION_TOKEN"]) process.env[key] = randomBytes(32).toString("hex");
  process.env.USER_API_KEY_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  const fixture = process.argv.includes("--fixtures");
  const mongo = await MongoMemoryServer.create({ binary: { version: "7.0.24" }, instance: { launchTimeout: 30000 } });
  await mongoose.connect(mongo.getUri());
  const User = requireBackend("./models/userModel"); const Chat = requireBackend("./models/chatModel"); const Generation = requireBackend("./models/generationModel");
  await Promise.all([User.init(), Chat.init(), Generation.init(), requireBackend("./models/providerCredentialModel").init()]);
  await User.create({ email: "student@example.test", password: "Student-demo-123", isVerified: true });
  const services = fixture ? {
    email: { sendVerificationEmail: async () => {}, sendPasswordResetEmail: async () => {} },
    generate: async ({ prompt }) => {
      if (prompt.includes("provider outage")) throw new Error("Simulated provider unavailable");
      if (prompt.includes("slow response")) await new Promise((resolve) => setTimeout(resolve, 1200));
      return { text: prompt.includes("ABSTRACT:") ? "This is a synthetic browser-test answer with a citation [1]. It exercises the source display and save workflow. It is not medical advice." : "This is a synthetic test answer. Ask a health question to test the PubMed source workflow.", model: "browser-test-fixture" };
    },
    fetchSources: async (prompt) => prompt.includes("no results") ? [] : [{ title: "Synthetic PubMed record for browser workflow testing", pmid: "123", url: "https://pubmed.ncbi.nlm.nih.gov/123/", journal: "Test fixture", pubdate: "2026", abstract: "Synthetic abstract. Used only for software workflow verification." }],
  } : {};
  const app = requireBackend("./app").createApp({ services });
  const server = require("http").createServer(app); const wss = requireBackend("./services/websocketService").attachWebSockets(server, app);
  server.listen(5000, "127.0.0.1", () => console.log("Local API: http://127.0.0.1:5000 | " + (fixture ? "SYNTHETIC PROVIDER FIXTURES" : "LIVE PUBMED, GEMINI REQUIRES KEY") + " | student@example.test / Student-demo-123"));
  fs.mkdirSync(path.join(root, "tmp/qa"), { recursive: true });
  fs.writeFileSync(path.join(root, "tmp/qa/local-mode.json"), JSON.stringify({ mode: fixture ? "synthetic provider fixtures" : "live PubMed; Gemini unavailable without a key", account: "student@example.test", startedAt: new Date().toISOString(), database: "ephemeral isolated MongoDB" }, null, 2));
  const stop = async () => { for (const ws of wss.clients) ws.terminate(); wss.close(); server.close(); await mongoose.disconnect(); await mongo.stop(); process.exit(0); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
}
main().catch((error) => { console.error(error); process.exit(1); });
