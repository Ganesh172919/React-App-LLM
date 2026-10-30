const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../frontend/src/index.css');
let css = fs.readFileSync(file, 'utf8');

const target1 = '.ai-settings .settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }';
const replace1 = '.settings-grid, .ai-settings .settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }\r\n.settings-grid select, .ai-settings .settings-grid select, .settings-grid input { width: 100%; min-width: 0; }';
css = css.replace(target1, replace1);

const target2 = '.ai-settings .settings-grid { grid-template-columns: 1fr; gap: 0; }';
const replace2 = '.settings-grid, .ai-settings .settings-grid { grid-template-columns: 1fr; gap: 0; }';
css = css.replace(target2, replace2);

const darkAdditions = `
[data-theme="dark"] a {
  color: #2dd4bf;
}
[data-theme="dark"] a:hover {
  color: #5eead4;
}
[data-theme="dark"] .site-footer {
  background: #0f172a;
  border-top-color: #1e293b;
  color: #94a3b8;
}
[data-theme="dark"] dialog {
  background: #111c2e;
  color: #e2e8f0;
  border-color: #1e293b;
  box-shadow: 0 16px 48px #00000080;
}
[data-theme="dark"] dialog::backdrop {
  background: #00000088;
}
[data-theme="dark"] .text-button,
[data-theme="dark"] .session-actions button {
  color: #2dd4bf;
}
[data-theme="dark"] .text-button:hover,
[data-theme="dark"] .session-actions button:hover {
  color: #5eead4;
}
[data-theme="dark"] .session-actions button.danger-text,
[data-theme="dark"] .text-button.danger-text {
  color: #f87171;
}
[data-theme="dark"] .metric strong {
  color: #f1f5f9;
}
[data-theme="dark"] .dashboard-empty {
  background: #0f2438;
  border-color: #1e3e5f;
}
[data-theme="dark"] table th,
[data-theme="dark"] table td {
  border-bottom-color: #1e293b;
  color: #e2e8f0;
}
[data-theme="dark"] .bar-space {
  border-bottom-color: #1e293b;
}
[data-theme="dark"] .bar-column {
  color: #94a3b8;
}
[data-theme="dark"] .calc-result-metric {
  color: #f1f5f9;
}
[data-theme="dark"] .modal-header,
[data-theme="dark"] .calc-tabs {
  border-bottom-color: #1e293b;
}
[data-theme="dark"] .offline-banner {
  background: #2b1d04;
  border-left-color: #f59e0b;
  color: #fef08a;
}
[data-theme="dark"] .citation-pill {
  background: #132b38;
  color: #2dd4bf;
  border-color: #1d4d5a;
}
[data-theme="dark"] .citation-pill:hover,
[data-theme="dark"] .citation-pill:focus-visible {
  background: #0d9488;
  color: #ffffff;
  border-color: #0d9488;
}
[data-theme="dark"] .citation-target-highlight {
  background: #17424b !important;
}
[data-theme="dark"] .prose pre {
  background: #0a101d;
  color: #e2e8f0;
  border: 1px solid #1e293b;
}
[data-theme="dark"] .prose code {
  background: #1e293b;
  color: #e2e8f0;
}
[data-theme="dark"] .empty-icon {
  background: #16243a;
  color: #2dd4bf;
}
[data-theme="dark"] .lead {
  color: #94a3b8;
}
[data-theme="dark"] .feature-step {
  color: #2dd4bf;
}
[data-theme="dark"] .grounding-hint {
  color: #2dd4bf;
}
[data-theme="dark"] .key-hint {
  background: #16243a;
  color: #94a3b8;
  border-color: #27374d;
}
[data-theme="dark"] .key-list li {
  border-bottom-color: #1e293b;
}
[data-theme="dark"] .settings-divider {
  border-top-color: #1e293b;
}
[data-theme="dark"] .conversation-heading {
  border-bottom-color: #1e293b;
}
[data-theme="dark"] details summary {
  color: #2dd4bf;
}
`;

css = css.trimEnd() + '\r\n' + darkAdditions.replace(/\r?\n/g, '\r\n').trim() + '\r\n';
fs.writeFileSync(file, css);
console.log('index.css successfully updated');
