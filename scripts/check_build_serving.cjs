// HTTP checks for a running isolated production-bundle QA server.
const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const base = process.env.APP_URL || "http://127.0.0.1:4173";
const results = [];
async function check(name, action) {
  try { await action(); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: error.message }); }
}
async function main() {
  const get = (url) => fetch(new URL(url, base), { signal: AbortSignal.timeout(10000) });
  const home = await get("/"); const html = await home.text();
  await check("Built index uses hashed assets without Vite development runtime", async () => {
    assert.equal(home.status, 200); assert.match(html, /\/assets\/.+\.js/);
    assert.doesNotMatch(html, /@vite\/client|@react-refresh/);
  });
  await Promise.all([
    check("Deep link returns the SPA document", async () => { const response = await get("/chat"); assert.equal(response.status, 200); assert.equal(await response.text(), html); }),
    check("JavaScript has correct MIME and immutable cache", async () => { const asset = html.match(/src="([^\"]+\.js)"/)[1]; const response = await get(asset); assert.equal(response.status, 200); assert.match(response.headers.get("content-type"), /javascript/); assert.match(response.headers.get("cache-control"), /immutable/); }),
    check("Missing JavaScript returns 404 instead of HTML", async () => { const response = await get("/assets/qa-missing-file.js"); assert.equal(response.status, 404); }),
    check("Readiness confirms connected MongoDB", async () => { const response = await get("/api/ready"); assert.equal(response.status, 200); assert.equal((await response.json()).database, "connected"); }),
    check("API responses prohibit caching and MIME sniffing", async () => { const response = await get("/api/health"); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store"); assert.equal(response.headers.get("x-content-type-options"), "nosniff"); }),
    check("Unknown API endpoint returns JSON 404", async () => { const response = await get("/api/qa-missing-endpoint"); assert.equal(response.status, 404); assert.equal((await response.json()).code, "NOT_FOUND"); }),
  ]);
  const output = path.resolve(__dirname, "../output/qa/build-serving-results.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ completedAt: new Date().toISOString(), base, mode: "Built-output QA gateway; does not execute Nginx or Docker", results, passed: results.every((item) => item.passed) }, null, 2));
  for (const result of results) console.log((result.passed ? "PASS " : "FAIL ") + result.name + (result.error ? ": " + result.error : ""));
  process.exitCode = results.every((item) => item.passed) ? 0 : 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
