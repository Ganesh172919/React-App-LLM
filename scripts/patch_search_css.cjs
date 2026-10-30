const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../frontend/src/index.css');
let css = fs.readFileSync(file, 'utf8');

const searchStyles = `
/* Search Input with Clear Button */
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}
.search-input-wrapper input {
  padding-right: 32px;
  margin-top: 0;
}
.search-clear-btn {
  position: absolute;
  right: 8px;
  background: transparent;
  border: 0;
  color: #64748b;
  font-size: .85rem;
  padding: 4px;
  cursor: pointer;
  line-height: 1;
}
.search-clear-btn:hover {
  color: #0f172a;
}
[data-theme="dark"] .search-clear-btn {
  color: #94a3b8;
}
[data-theme="dark"] .search-clear-btn:hover {
  color: #f1f5f9;
}
`;

css = css.replace('.history-filter-bar {', searchStyles.replace(/\r?\n/g, '\r\n').trim() + '\r\n.history-filter-bar {');
fs.writeFileSync(file, css);
console.log('Search styles added to index.css');
