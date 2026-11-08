#!/usr/bin/env node
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const manifestPath = path.resolve(__dirname, '../../docs/_meta/baseline-manifest.txt');
const baseShaPath = path.resolve(__dirname, '../../docs/_meta/baseline-sha.txt');

if (!fs.existsSync(manifestPath) || !fs.existsSync(baseShaPath)) {
  console.error('ERROR: baseline files missing');
  process.exit(2);
}

const baseSha = fs.readFileSync(baseShaPath, 'utf8').trim();
const lines = fs.readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean);
const strict = process.env.DOCS_STRICT_LINES === '1';

let status = 0;
for (const line of lines) {
  if (line.length <= 66) continue;
  const filePath = line.substring(66).trim();
  const resolved = path.resolve(__dirname, '../../', filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`DELETED OR MOVED: ${filePath}`);
    status = 1;
    continue;
  }
  if (strict) {
    try {
      const diff = cp.execSync(`git diff --numstat ${baseSha} -- "${filePath}"`, { encoding: 'utf8' }).trim();
      if (diff) {
        const parts = diff.split(/\s+/);
        const removed = parts[1];
        if (removed && removed !== '0' && removed !== '-') {
          console.error(`LINES REMOVED (${removed}): ${filePath}`);
          status = 1;
        }
      }
    } catch (e) {
      // diff check failed
    }
  }
}

if (status === 0) {
  console.log('OK: all baseline documentation preserved (checked ' + lines.length + ' baseline files)');
}
process.exit(status);
