#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const backendEnvPath = path.join(repoRoot, 'backend/.env.example');
const frontendEnvPath = path.join(repoRoot, 'frontend/.env.example');
const coverageMatrixPath = path.join(repoRoot, 'docs/_meta/coverage-matrix.md');

function extractEnvKeys(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)=/);
    if (match) keys.push(match[1]);
  }
  return keys;
}

const backendKeys = extractEnvKeys(backendEnvPath);
const frontendKeys = extractEnvKeys(frontendEnvPath);
const allKeys = Array.from(new Set([...backendKeys, ...frontendKeys]));

if (!fs.existsSync(coverageMatrixPath)) {
  console.error('ERROR: docs/_meta/coverage-matrix.md does not exist');
  process.exit(1);
}

const coverageContent = fs.readFileSync(coverageMatrixPath, 'utf8');
const missing = [];

for (const key of allKeys) {
  if (!coverageContent.includes(`\`${key}\``) && !coverageContent.includes(key)) {
    missing.push(key);
  }
}

if (missing.length > 0) {
  console.error(`ERROR: The following ${missing.length} environment variables are missing from docs/_meta/coverage-matrix.md:`);
  for (const k of missing) {
    console.error(`  - ${k}`);
  }
  process.exit(1);
}

console.log(`OK: All ${allKeys.length} environment variables from .env.example are covered in docs/_meta/coverage-matrix.md`);
process.exit(0);
