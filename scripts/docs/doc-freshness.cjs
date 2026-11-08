#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const dirsToScan = [
  path.join(repoRoot, 'docs'),
  path.join(repoRoot, 'deploy'),
  path.join(repoRoot, 'Model and Dataset'),
];
const rootFilesToScan = [
  path.join(repoRoot, 'README.md'),
  path.join(repoRoot, 'CONTRIBUTING.md'),
  path.join(repoRoot, 'AGENTS.md'),
  path.join(repoRoot, 'llms.txt'),
];

function getMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'templates') continue;
      files = files.concat(getMarkdownFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.txt'))) {
      files.push(fullPath);
    }
  }
  return files;
}

let allFiles = [...rootFilesToScan.filter((f) => fs.existsSync(f))];
for (const dir of dirsToScan) {
  allFiles = allFiles.concat(getMarkdownFiles(dir));
}

let checkedLinks = 0;
let brokenLinks = [];

const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    let linkTarget = match[2].trim();
    // Skip external URLs, anchors, mailto, etc.
    if (
      linkTarget.startsWith('http://') ||
      linkTarget.startsWith('https://') ||
      linkTarget.startsWith('mailto:') ||
      linkTarget.startsWith('#') ||
      linkTarget.startsWith('conversation://') ||
      linkTarget.startsWith('sidecar://')
    ) {
      continue;
    }

    // Handle file:/// absolute URIs
    if (linkTarget.startsWith('file:///')) {
      checkedLinks++;
      let rawPath = linkTarget.slice(8); // strip file:///
      rawPath = decodeURIComponent(rawPath.split('#')[0].split('?')[0]);
      if (/^[a-zA-Z]:/.test(rawPath)) {
        // Windows drive letter like c:/...
        rawPath = path.normalize(rawPath);
      }
      if (!fs.existsSync(rawPath)) {
        brokenLinks.push({
          sourceFile: path.relative(repoRoot, filePath),
          link: linkTarget,
          resolved: rawPath,
        });
      }
      continue;
    }

    // Strip anchor and query from relative link
    let cleanTarget = linkTarget.split('#')[0].split('?')[0];
    if (!cleanTarget) continue; // Pure anchor like (#heading)

    cleanTarget = decodeURIComponent(cleanTarget);
    checkedLinks++;
    const resolvedPath = path.resolve(path.dirname(filePath), cleanTarget);
    if (!fs.existsSync(resolvedPath)) {
      brokenLinks.push({
        sourceFile: path.relative(repoRoot, filePath),
        link: linkTarget,
        resolved: path.relative(repoRoot, resolvedPath),
      });
    }
  }
}

if (brokenLinks.length > 0) {
  console.error(`ERROR: Found ${brokenLinks.length} broken links across ${allFiles.length} files (checked ${checkedLinks} links):`);
  for (const b of brokenLinks) {
    console.error(`  in ${b.sourceFile}: [link](${b.link}) -> missing ${b.resolved}`);
  }
  process.exit(1);
}

console.log(`OK: All ${checkedLinks} relative/file links verified across ${allFiles.length} markdown/text files.`);
process.exit(0);
