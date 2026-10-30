const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../frontend/src/components/chat/ChatWorkspace.jsx');
let content = fs.readFileSync(file, 'utf8');

const oldMsg = `          loadHistory();
          if (message.data.sessionId === activeRef.current) {
            if (message.data.action === "DELETE") { controller.current?.abort(); busyRef.current = false; setBusy(false); selectActive(null); setMessages([]); setPending(null); }
            else refreshActive();
          }`;

const newMsg = `          loadHistory();
          if (message.data.action === "CLEAR_ALL") {
            controller.current?.abort(); busyRef.current = false; setBusy(false); selectActive(null); setMessages([]); setPending(null);
          } else if (message.data.sessionId === activeRef.current) {
            if (message.data.action === "DELETE") { controller.current?.abort(); busyRef.current = false; setBusy(false); selectActive(null); setMessages([]); setPending(null); }
            else refreshActive();
          }`;

if (!content.includes(oldMsg.replace(/\r?\n/g, '\r\n')) && !content.includes(oldMsg.replace(/\r?\n/g, '\n'))) {
  throw new Error('oldMsg not found');
}
content = content.replace(content.includes('\r\n') ? oldMsg.replace(/\r?\n/g, '\r\n') : oldMsg.replace(/\r?\n/g, '\n'), content.includes('\r\n') ? newMsg.replace(/\r?\n/g, '\r\n') : newMsg.replace(/\r?\n/g, '\n'));

const oldSearch = `<label className="search-label">Search history<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={80} placeholder="Search titles and questions" /></label>`;

const newSearch = `<label className="search-label" htmlFor="history-search">Search history</label>
        <div className="search-input-wrapper">
          <input
            id="history-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.stopPropagation();
                setQuery("");
              }
            }}
            maxLength={80}
            placeholder="Search titles and questions"
          />
          {query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setQuery("");
                drawer.current?.querySelector("input")?.focus();
              }}
              aria-label="Clear search query"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>`;

if (!content.includes(oldSearch)) {
  throw new Error('oldSearch not found');
}
content = content.replace(oldSearch, content.includes('\r\n') ? newSearch.replace(/\r?\n/g, '\r\n') : newSearch.replace(/\r?\n/g, '\n'));

fs.writeFileSync(file, content);
console.log('ChatWorkspace.jsx successfully updated');
