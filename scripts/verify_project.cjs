const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const root = path.resolve(__dirname, ".."); const output = path.join(root, "output/qa"); fs.mkdirSync(output, { recursive: true });
const python = process.env.PYTHON_BIN || "python";
const node = process.execPath;
const checks = [
  ["backend", node, ["--test", "--test-concurrency=1", "--test-reporter=tap"], "backend"],
  ["frontend-lint", node, ["node_modules/eslint/bin/eslint.js", "."], "frontend"],
  ["frontend-tests", node, ["node_modules/vitest/vitest.mjs", "run", "--reporter=json", "--outputFile=" + path.join(output, "frontend-results.json")], "frontend"],
  ["frontend-build", node, ["node_modules/vite/bin/vite.js", "build"], "frontend"],
  ["dataset-tests", python, ["-m", "unittest", "discover", "-s", "Model and Dataset", "-p", "test_*.py"], "."],
  ["lora-tests", python, ["-m", "unittest", "discover", "-s", "Model and Dataset/lora", "-p", "test_*.py"], "."],
  ["lora-dry-run", python, ["Model and Dataset/lora/train_lora.py"], "."],
];
const results = [];
for (const [name, command, args, cwd] of checks) {
  const started = Date.now(); const result = spawnSync(command, args, { cwd: path.join(root, cwd), encoding: "utf8", timeout: 240000, maxBuffer: 10 * 1024 * 1024 });
  const log = (result.stdout || "") + (result.stderr || ""); fs.writeFileSync(path.join(output, name + ".log"), log);
  results.push({ name, passed: result.status === 0, exitCode: result.status, durationMs: Date.now() - started, error: result.error?.message || null, log: name + ".log" });
  console.log((result.status === 0 ? "PASS " : "FAIL ") + name);
  if (result.status !== 0) console.log(log.slice(-3500));
}
for (const target of ["backend", "frontend"]) {
  const npmCli = path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
  const result = spawnSync(node, [npmCli, "audit", "--omit=dev", "--json"], { cwd: path.join(root, target), encoding: "utf8", timeout: 90000, maxBuffer: 5 * 1024 * 1024 });
  const log = (result.stdout || "") + (result.stderr || ""); fs.writeFileSync(path.join(output, target + "-audit.json"), result.stdout || "{}");
  results.push({ name: target + "-production-audit", passed: result.status === 0, exitCode: result.status, log: target + "-audit.json" });
  console.log((result.status === 0 ? "PASS " : "FAIL ") + target + "-production-audit"); if (result.status !== 0) console.log(log.slice(-1000));
}
fs.writeFileSync(path.join(output, "automated-results.json"), JSON.stringify({ completedAt: new Date().toISOString(), node: process.version, checks: results, passed: results.every((item) => item.passed) }, null, 2));
process.exitCode = results.every((item) => item.passed) ? 0 : 1;
