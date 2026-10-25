/**
 * ============================================================================
 * MEDASSIST AI - CHAT HISTORY SIDEBAR COMPONENT (Sidebar.jsx)
 * ============================================================================
 * Role:
 *   Renders the collapsible conversation history navigation drawer. Provides
 *   instant title search filtering, new chat initialization, session selection,
 *   inline session renaming, conversation JSON downloading/exporting, and confirmed
 *   session deletion.
 *
 * Props:
 *   - onNewChat: Function resetting conversation state for a fresh chat.
 *   - chatSessions: Object grouping sessions by temporal categories (Today, etc.).
 *   - handleLoadChat: Function loading an existing conversation session.
 *   - handleDeleteChat: Function executing session deletion.
 *   - handleRenameChat: Function saving edited session title.
 *   - handleExportChat: Function downloading conversation as formatted JSON.
 *   - loadingStates: Async operations indicators (e.g. saving, deleting).
 *   - deletingSessionIds: Set of session IDs undergoing active deletion.
 *   - activeSessionId: Currently active chat ID.
 *   - isNewChat: Boolean indicating if workspace is in an unsaved state.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: SIDEBAR STATE & USER ACTIONS
 * ----------------------------------------------------------------------------
 * [Sidebar Component]
 *   │
 *   ├── 1. Header Controls
 *   │     ├── "New conversation" Button ──► Triggers onNewChat()
 *   │     └── Close Drawer Button [×]    ──► Sets setSidebarOpen(false)
 *   │
 *   ├── 2. Live Search Filtering (query state)
 *   │     ├── User types query into search input
 *   │     └── useMemo filters grouped sessions matching normalized search text
 *   │
 *   ├── 3. Grouped Session Listing (Today / Yesterday / Last 5 Days / Previous)
 *   │     ├── Session Item: Highlighted if activeSessionId === sessionId
 *   │     ├── Load Chat: Clicking title invokes handleLoadChat(session)
 *   │     ├── Inline Rename (editingId === sessionId):
 *   │     │     ├── Input field for title editing (max 80 chars)
 *   │     │     └── Save button submits handleRenameChat(sessionId, draftTitle)
 *   │     ├── Export Action: Invokes handleExportChat(session)
 *   │     └── Delete Action: Prompts window.confirm() -> handleDeleteChat(sessionId)
 *   │
 *   └── 4. Footer Link
 *         └── Link to /dashboard ("Open analytics dashboard")
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: CONVERSATION ACTIONS INTERACTION
 * ----------------------------------------------------------------------------
 *  [User in Sidebar]
 *         │
 *         ├──► Click "New conversation" ──► onNewChat() ──► Reset Chat View
 *         │
 *         ├──► Type in Search Input ─────► useMemo() ────► Filter Grouped List
 *         │
 *         ├──► Click Chat Item ──────────► handleLoadChat(session) ──► Load History
 *         │
 *         ├──► Click "Rename" ───────────► Show input ──► submitRename() ──► PATCH API
 *         │
 *         ├──► Click "Export" ───────────► handleExportChat() ──► Download JSON
 *         │
 *         └──► Click "Delete" ───────────► window.confirm() ──► DELETE API
 * ============================================================================
 */
import { useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SidebarContext } from "../context/SidebarContext";

/**
 * Resolve the primary session ID whether stored in `sessionId` or `id`.
 * @param {object} session
 * @returns {string}
 */
const getSessionId = (session) => session.sessionId || session.id;

/**
 * Extract display title with fallback to the initial prompt snippet or "New Chat".
 * @param {object} session
 * @returns {string}
 */
const getSessionTitle = (session) =>
  session.title || session.messages?.[0]?.text?.slice(0, 60) || "New Chat";

function Sidebar({
  onNewChat,
  chatSessions,
  handleLoadChat,
  handleDeleteChat,
  handleRenameChat,
  handleExportChat,
  loadingStates,
  deletingSessionIds,
  activeSessionId,
  isNewChat,
}) {
  const { sidebarOpen, setSidebarOpen } = useContext(SidebarContext);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return Object.entries(chatSessions)
      .map(([category, sessions]) => [
        category,
        sessions.filter((session) =>
          getSessionTitle(session).toLocaleLowerCase().includes(normalizedQuery)
        ),
      ])
      .filter(([, sessions]) => sessions.length > 0);
  }, [chatSessions, query]);

  /**
   * Enter inline rename mode for the chosen conversation session.
   * @param {object} session
   */
  const startRenaming = (session) => {
    setEditingId(getSessionId(session));
    setDraftTitle(getSessionTitle(session));
  };

  /**
   * Commit the modified title to the backend and exit inline edit state.
   * @param {string} sessionId
   */
  const submitRename = async (sessionId) => {
    const title = draftTitle.trim();
    if (title) await handleRenameChat(sessionId, title);
    setEditingId(null);
    setDraftTitle("");
  };

  return (
    <aside
      aria-label="Chat history"
      className={`fixed inset-y-0 left-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-[300px] flex-col border-r border-slate-800 bg-slate-950 shadow-2xl transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-slate-800 p-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          New conversation
        </button>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-md border border-slate-700 p-2.5 text-slate-400 hover:text-white"
          aria-label="Close chat history"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div className="border-b border-slate-800 p-3">
        <label htmlFor="chat-search" className="sr-only">Search conversations</label>
        <input
          id="chat-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search conversations"
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filteredGroups.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-slate-500">
            {query ? "No matching conversations" : "Your saved conversations will appear here"}
          </p>
        ) : (
          filteredGroups.map(([category, sessions]) => (
            <section key={category} className="mb-5">
              <h2 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                {category}
              </h2>
              <ul className="space-y-1">
                {sessions.map((session) => {
                  const sessionId = getSessionId(session);
                  const active = activeSessionId === sessionId && !isNewChat;
                  return (
                    <li
                      key={sessionId}
                      className={`rounded-md border p-2 transition ${
                        active
                          ? "border-cyan-500/40 bg-cyan-400/10"
                          : "border-transparent hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      {editingId === sessionId ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            submitRename(sessionId);
                          }}
                          className="flex gap-1"
                        >
                          <input
                            autoFocus
                            maxLength={80}
                            value={draftTitle}
                            onChange={(event) => setDraftTitle(event.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-cyan-600 bg-slate-950 px-2 py-1 text-sm outline-none"
                          />
                          <button type="submit" className="px-2 text-xs text-cyan-300">Save</button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleLoadChat(session)}
                          className="w-full truncate px-1 text-left text-sm text-slate-200"
                          disabled={deletingSessionIds.has(sessionId) || loadingStates.loadingChat}
                          title={getSessionTitle(session)}
                        >
                          {getSessionTitle(session)}
                        </button>
                      )}
                      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-slate-500">
                        <button type="button" onClick={() => startRenaming(session)} className="rounded px-2 py-1 hover:bg-slate-800 hover:text-white">
                          Rename
                        </button>
                        <button type="button" onClick={() => handleExportChat(session)} className="rounded px-2 py-1 hover:bg-slate-800 hover:text-white">
                          Export
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete “${getSessionTitle(session)}”?`)) {
                              handleDeleteChat(sessionId);
                            }
                          }}
                          className="rounded px-2 py-1 text-rose-400 hover:bg-rose-950 hover:text-rose-300"
                          disabled={!sessionId || deletingSessionIds.has(sessionId)}
                        >
                          {deletingSessionIds.has(sessionId) ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <div className="border-t border-slate-800 p-3">
        <Link
          to="/dashboard"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-cyan-500 hover:text-white"
        >
          Open analytics dashboard
        </Link>
      </div>
    </aside>
  );
}

export default Sidebar;
