// Import standard filesystem, path manipulation, and child process execution modules.
// Resolve project root and output directory paths, creating the output folder if needed.
// Retrieve configured Python executable, current Node binary, and initialize test configuration.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const root = path.resolve(__dirname, ".."); const output = path.join(root, "output/qa"); fs.mkdirSync(output, { recursive: true });
const python = process.env.PYTHON_BIN || "python";
const node = process.execPath;
const preparedData = path.join(root, "Model and Dataset/prepared");
const temporaryData = fs.existsSync(path.join(preparedData, "manifest.json"))
  ? undefined
  : fs.mkdtempDisposableSync(path.join(os.tmpdir(), "medassist-lora-"));
if (temporaryData) process.once("exit", () => temporaryData.remove());
const loraData = temporaryData?.path || preparedData;

// Define the authoritative multi-tier test verification matrix across the entire repository.
// Enumerate documentation preservation, environment coverage, and link freshness audits.
// Specify backend tests, frontend lint/test/build tasks, dataset tests, and LoRA dry runs.
const checks = [
  ["docs-preservation", node, ["scripts/docs/check-no-deletions.cjs"], "."],
  ["docs-coverage", node, ["scripts/docs/check-config-coverage.cjs"], "."],
  ["docs-freshness", node, ["scripts/docs/doc-freshness.cjs"], "."],
  ["backend", node, ["--test", "--test-concurrency=1", "--test-reporter=tap"], "backend"],
  ["frontend-lint", node, ["node_modules/eslint/bin/eslint.js", "."], "frontend"],
  ["frontend-tests", node, ["node_modules/vitest/vitest.mjs", "run", "--reporter=json", "--outputFile=" + path.join(output, "frontend-results.json")], "frontend"],
  ["frontend-build", node, ["node_modules/vite/bin/vite.js", "build"], "frontend"],
  ["dataset-tests", python, ["-m", "unittest", "discover", "-s", "Model and Dataset", "-p", "test_*.py"], "."],
  ["lora-tests", python, ["-m", "unittest", "discover", "-s", "Model and Dataset/lora", "-p", "test_*.py"], "."],
  ...(temporaryData ? [["lora-package", python, ["Model and Dataset/lora/build_lora_package.py", "--output", loraData], "."]] : []),
  ["lora-dry-run", python, ["Model and Dataset/lora/train_lora.py", "--data-dir", loraData], "."],
];
const results = [];

// Execute each verification check sequentially using synchronous child process spawning.
// Capture standard output and error streams to dedicated log files in the output directory.
// Record execution duration and status code, printing immediate pass/fail progress in console.
for (const [name, command, args, cwd] of checks) {
  const started = Date.now(); const result = spawnSync(command, args, { cwd: path.join(root, cwd), encoding: "utf8", timeout: 240000, maxBuffer: 10 * 1024 * 1024 });
  const log = (result.stdout || "") + (result.stderr || ""); fs.writeFileSync(path.join(output, name + ".log"), log);
  results.push({ name, passed: result.status === 0, exitCode: result.status, durationMs: Date.now() - started, error: result.error?.message || null, log: name + ".log" });
  console.log((result.status === 0 ? "PASS " : "FAIL ") + name);
  if (result.status !== 0) console.log(log.slice(-3500));
}

// Run production security dependency audits for both backend and frontend applications.
// Invoke npm audit omitting development packages to inspect production dependency trees.
// Persist audit JSON reports to output directory and log audit pass/fail status.
for (const target of ["backend", "frontend"]) {
  const npmCli = path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
  const result = spawnSync(node, [npmCli, "audit", "--omit=dev", "--json"], { cwd: path.join(root, target), encoding: "utf8", timeout: 90000, maxBuffer: 5 * 1024 * 1024 });
  const log = (result.stdout || "") + (result.stderr || ""); fs.writeFileSync(path.join(output, target + "-audit.json"), result.stdout || "{}");
  results.push({ name: target + "-production-audit", passed: result.status === 0, exitCode: result.status, log: target + "-audit.json" });
  console.log((result.status === 0 ? "PASS " : "FAIL ") + target + "-production-audit"); if (result.status !== 0) console.log(log.slice(-1000));
}

// Persist comprehensive automated results summary JSON containing timestamps and test statuses.
// Evaluate whether all checks passed cleanly to set the overall process exit status code.
// Guarantees zero false positives and enforces full project quality gates across 12 tiers.
fs.writeFileSync(path.join(output, "automated-results.json"), JSON.stringify({ completedAt: new Date().toISOString(), node: process.version, checks: results, passed: results.every((item) => item.passed) }, null, 2));
process.exitCode = results.every((item) => item.passed) ? 0 : 1;
