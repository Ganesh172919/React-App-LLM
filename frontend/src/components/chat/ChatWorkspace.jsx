import { useCallback, useContext, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AuthContext } from "../../context/AuthContext";
import { apiRequest, downloadJson, downloadText, formatChatAsMarkdown, getWebSocketUrl, refreshSession } from "../../lib/api";
import { readTab, writeTab, readPending } from "../../lib/tabStorage";
import { MAX_IMPORT_BYTES, parseConversationImport } from "../../lib/conversationImport";
import { isMedicalQuery } from "../../utils/medicalDetector";
import ClinicalCalculatorsModal from "../tools/ClinicalCalculatorsModal";
const labels = { citation_checked: "Citation numbers checked", references_only: "References only", generated: "AI generated", safety_redirect: "Safety response", insufficient_evidence: "Insufficient evidence", provider_unavailable: "Literature unavailable", invalid_citations: "Citation issue", sources_supplied: "Sources supplied" };
// Chat text is untrusted. Only server-selected PubMed records below may open a URL.
const safeMessageComponents = {
  a: ({ children }) => <span className="inactive-link">{children}</span>,
  img: ({ alt }) => <span className="muted">{alt ? `[Image omitted: ${alt}]` : "[Image omitted]"}</span>,
};
export default function ChatWorkspace() {
  const { user } = useContext(AuthContext);
  const draftKey = "medassist-draft-" + user.id;
  const pendingKey = draftKey + "-pending";
  const [recovered] = useState(() => readPending(pendingKey));
  const [prompt, setPrompt] = useState(() => readTab(draftKey));
  const [messages, setMessages] = useState(() => recovered ? [{ id: recovered.exchangeId + "-user", text: recovered.prompt, isUser: true }, ...(recovered.result ? [{ ...recovered.result, id: recovered.exchangeId + "-assistant", isUser: false }] : [])] : []); const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState(recovered?.sessionId || null); const [activeName, setActiveName] = useState(""); const [query, setQuery] = useState(""); const [cursor, setCursor] = useState(null);
  const [busy, setBusy] = useState(false); const [status, setStatus] = useState(""); const [error, setError] = useState("");
  const [pending, setPendingState] = useState(recovered); const pendingRef = useRef(recovered);
  const [loadingChat, setLoadingChat] = useState(false); const [deletingBusy, setDeletingBusy] = useState(false); const [copied, setCopied] = useState(null);
  const [copiedCitation, setCopiedCitation] = useState(null);
  const [copiedSummary, setCopiedSummary] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [online, setOnline] = useState(false); const [historyBusy, setHistoryBusy] = useState(true);
  const [editing, setEditing] = useState(null); const [title, setTitle] = useState(""); const [deleting, setDeleting] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [importPreview, setImportPreview] = useState(false);
  const historyToggle = useRef(null); const wasSidebarOpen = useRef(false);
  const activeRef = useRef(recovered?.sessionId || null); const busyRef = useRef(false); const view = useRef(0); const mounted = useRef(true); const queryRef = useRef("");
  const historyRequest = useRef(0); const controller = useRef(null); const messagesPane = useRef(null); const composerInput = useRef(null); const deleteDialog = useRef(null); const clearAllDialog = useRef(null); const drawer = useRef(null); const importFileInput = useRef(null);
  const selectActive = (id) => { activeRef.current = id; setActive(id); };
  const setPending = useCallback((job) => {
    pendingRef.current = job; setPendingState(job);
    writeTab(pendingKey, job ? JSON.stringify({ ...job, storedAt: job.storedAt || Date.now() }) : null);
  }, [pendingKey]);
  const loadHistory = useCallback(async (nextCursor = null) => {
    const request = ++historyRequest.current; setHistoryBusy(true);
    try {
      const search = new URLSearchParams({ q: queryRef.current, limit: "30" }); if (nextCursor) search.set("cursor", nextCursor);
      const data = await apiRequest("/history?" + search);
      if (mounted.current && request === historyRequest.current) { setSessions((old) => nextCursor ? [...old, ...data.items.filter((item) => !old.some((existing) => existing.id === item.id))] : data.items); setCursor(data.nextCursor); }
    } catch (err) { if (mounted.current && request === historyRequest.current) setError("History could not be loaded. " + err.message); }
    finally { if (mounted.current && request === historyRequest.current) setHistoryBusy(false); }
  }, []);
  const refreshActive = useCallback(async () => {
    const id = activeRef.current; const generation = view.current;
    if (!id || busyRef.current || pendingRef.current) return;
    try {
      const data = await apiRequest("/chats/" + id);
      if (mounted.current && generation === view.current && !busyRef.current && !pendingRef.current) { setMessages(data.messages); setActiveName(data.title); }
    } catch (err) {
      if (mounted.current && generation === view.current && err.status === 404) { activeRef.current = null; setActive(null); setMessages([]); }
    }
  }, []);
  useEffect(() => { writeTab(draftKey, prompt); }, [draftKey, prompt]);
  useEffect(() => {
    const warn = (event) => { if (pendingRef.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(() => {
    queryRef.current = query;
    const timeout = setTimeout(() => loadHistory(), 250); return () => clearTimeout(timeout);
  }, [query, loadHistory]);
  useEffect(() => { if (messagesPane.current) messagesPane.current.scrollTop = messages.length ? messagesPane.current.scrollHeight : 0; }, [messages, status]);
  useEffect(() => {
    mounted.current = true; let disposed = false; let socket; let timer; let attempts = 0;
    const connect = () => {
      if (disposed) return; socket = new WebSocket(getWebSocketUrl());
      socket.onopen = () => { attempts = 0; if (!disposed) { setOnline(true); loadHistory(); refreshActive(); } };
      socket.onmessage = (event) => {
        if (disposed) return;
        try {
          const message = JSON.parse(event.data); if (message.type !== "CHAT_UPDATE") return;
          loadHistory();
          if (message.data.action === "CLEAR_ALL") {
            controller.current?.abort(); busyRef.current = false; setBusy(false); selectActive(null); setMessages([]); setPending(null);
          } else if (message.data.sessionId === activeRef.current) {
            if (message.data.action === "DELETE") { controller.current?.abort(); busyRef.current = false; setBusy(false); selectActive(null); setMessages([]); setPending(null); }
            else refreshActive();
          }
        } catch { /* A malformed event cannot alter conversation state. */ }
      };
      socket.onerror = () => { if (!disposed) setOnline(false); };
      socket.onclose = async (event) => {
        if (disposed) return; setOnline(false);
        if (event.code === 4001) { try { await refreshSession(); } catch { return; } }
        else if (event.code === 1008) return;
        if (!disposed) timer = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 30000));
      };
    };
    connect();
    return () => { disposed = true; mounted.current = false; clearTimeout(timer); socket?.close(); controller.current?.abort(); if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel(); };
  }, [loadHistory, refreshActive, setPending]);
  useEffect(() => { if (sidebarOpen) drawer.current?.querySelector("input")?.focus(); }, [sidebarOpen]);
  useEffect(() => { if (wasSidebarOpen.current && !sidebarOpen) historyToggle.current?.focus(); wasSidebarOpen.current = sidebarOpen; }, [sidebarOpen]);
  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.innerWidth <= 700) setSidebarOpen(true);
        drawer.current?.querySelector("input")?.focus();
      } else if (event.altKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        setCalcModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const loadChat = async (id) => {
    if (busyRef.current || pendingRef.current) return; const generation = ++view.current; busyRef.current = true; setLoadingChat(true); setError(""); setStatus(""); setCopied(null); setSidebarOpen(false);
    try { const chat = await apiRequest("/chats/" + id); if (mounted.current && generation === view.current) { selectActive(id); setActiveName(chat.title); setMessages(chat.messages); setImportPreview(false); } }
    catch (err) { if (mounted.current && generation === view.current) setError(err.message); }
    finally { busyRef.current = false; if (mounted.current && generation === view.current) setLoadingChat(false); }
  };
  const newChat = () => { if (busyRef.current || pendingRef.current) return; view.current++; selectActive(null); setActiveName(""); setMessages([]); setImportPreview(false); setError(""); setStatus(""); setCopied(null); setSidebarOpen(false); };
  const send = async (event, retry = null) => {
    event?.preventDefault(); if (importPreview || busyRef.current || (!retry && (!prompt.trim() || pendingRef.current))) return;
    const job = retry || { prompt: prompt.trim(), sessionId: activeRef.current, exchangeId: crypto.randomUUID() };
    const generation = view.current; busyRef.current = true; setBusy(true); setError(""); setPending(job);
    controller.current = new AbortController();
    if (!retry) {
      setMessages((old) => [...old, { id: job.exchangeId + "-user", text: job.prompt, isUser: true, timestamp: new Date().toISOString() }]); setPrompt("");
    }
    try {
      setStatus(job.result ? "Saving your answer..." : "Finding an answer...");
      if (!job.result) job.result = await apiRequest("/ai/chat", { method: "POST", body: JSON.stringify({ prompt: job.prompt, sessionId: job.sessionId, exchangeId: job.exchangeId }), signal: controller.current.signal });
      if (!mounted.current || generation !== view.current) return;
      setPending({ ...job });
      setMessages((old) => [...old.filter((item) => item.id !== job.exchangeId + "-assistant"), { ...job.result, id: job.exchangeId + "-assistant", isUser: false }]);
      setStatus("Saving your answer...");
      const saved = await apiRequest("/save", { method: "POST", body: JSON.stringify({ generationId: job.result.generationId }), signal: controller.current.signal });
      if (!mounted.current || generation !== view.current) return;
      selectActive(saved.sessionId); setActiveName(saved.chat.title); setMessages(saved.chat.messages); setPending(null); setStatus("Saved"); loadHistory();
    } catch (err) {
      if (mounted.current && generation === view.current && err.name !== "AbortError") { setPending({ ...job }); setError((job.result ? "Your answer is shown but has not been saved. " : "Your message could not be completed. ") + err.message); setStatus(""); }
    } finally { busyRef.current = false; if (mounted.current && generation === view.current) setBusy(false); }
  };
  const exportChat = async (session) => {
    try { const chat = await apiRequest("/chats/" + session.id); downloadJson("medassist-chat-" + session.id + ".json", { exportedAt: new Date().toISOString(), ...chat }); }
    catch (err) { setError(err.message); }
  };
  const exportActiveMarkdown = () => {
    if (!messages.length) return;
    try {
      const activeTitle = sessions.find((session) => session.id === active)?.title || activeName || "Health Q&A";
      const md = formatChatAsMarkdown({ title: activeTitle, sessionId: activeRef.current, messages, unverifiedImport: importPreview });
      downloadText(importPreview ? "medassist-unverified-preview.md" : "medassist-chat-" + (activeRef.current || "current") + ".md", md);
    } catch (err) { setError(err.message); }
  };
  const exportActiveJson = () => {
    if (!messages.length) return;
    try {
      const activeTitle = sessions.find((session) => session.id === active)?.title || activeName || "Health Q&A";
      downloadJson(importPreview ? "medassist-unverified-preview.json" : "medassist-chat-" + (activeRef.current || "current") + ".json", {
        title: activeTitle,
        sessionId: activeRef.current,
        exportedAt: new Date().toISOString(),
        ...(importPreview ? { exportKind: "unverified-local-preview", warning: "Imported text was not generated or verified by MedAssist AI and is not saved to the account." } : {}),
        messages,
      });
    } catch (err) { setError(err.message); }
  };
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("The JSON file must be 512 KB or smaller.");
      const fileText = typeof file.text === "function"
        ? await file.text()
        : await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result);
            reader.onerror = () => rej(reader.error);
            reader.readAsText(file);
          });
      const imported = parseConversationImport(fileText);
      view.current++;
      selectActive(null);
      setActiveName(imported.title);
      setMessages(imported.messages);
      setImportPreview(true);
      setError("");
      setStatus("");
      setSidebarOpen(false);
    } catch (err) {
      setError(err.message || "The conversation file could not be read.");
    }
  };
  const toggleSpeech = (message, id) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const clean = (message.text || "")
      .replace(/\[\d+\]/g, "")
      .replace(/[*_#`~]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => { if (mounted.current) setSpeakingId(null); };
    utterance.onerror = () => { if (mounted.current) setSpeakingId(null); };
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };
  const rename = async (event) => {
    event.preventDefault();
    try { const renamed = await apiRequest("/chats/" + editing, { method: "PATCH", body: JSON.stringify({ title: title.trim() }) }); if (activeRef.current === editing) setActiveName(renamed.title); setEditing(null); await loadHistory(); }
    catch (err) { setError(err.message); }
  };
  const togglePin = async (session) => {
    try {
      const updated = await apiRequest("/chats/" + session.id, {
        method: "PATCH",
        body: JSON.stringify({ isPinned: !session.isPinned }),
      });
      setSessions((old) =>
        old.map((item) => (item.id === session.id ? { ...item, isPinned: updated.isPinned } : item))
      );
    } catch (err) {
      setError(err.message);
    }
  };
  const remove = async () => {
    if (deletingBusy) return; setDeletingBusy(true);
    try {
      await apiRequest("/chats/" + deleting.id, { method: "DELETE" });
      if (activeRef.current === deleting.id) newChat(); await loadHistory(); deleteDialog.current.close(); setDeleting(null);
    } catch (err) { setError(err.message); deleteDialog.current.close(); }
    finally { setDeletingBusy(false); }
  };
  const clearAll = async () => {
    if (deletingBusy) return; setDeletingBusy(true);
    try {
      await apiRequest("/chats", { method: "DELETE" });
      newChat(); await loadHistory(); clearAllDialog.current?.close();
    } catch (err) { setError(err.message); clearAllDialog.current?.close(); }
    finally { setDeletingBusy(false); }
  };
  const copyAnswer = async (message, index) => {
    try { await navigator.clipboard.writeText(message.text); setCopied(message.id || index); }
    catch { setError("Copy is unavailable in this browser. You can select the answer text or export the conversation."); }
  };
  const copyCitation = async (reference, id) => {
    const authors = Array.isArray(reference.authors) && reference.authors.length ? reference.authors.slice(0, 6).join(", ") + (reference.authors.length > 6 ? ", et al" : "") : "Author not listed";
    const vancouver = `${authors}. ${(reference.title || "").replace(/\.$/, "")}. ${reference.journal || ""}. ${reference.pubdate || ""};${reference.pmid ? " PMID: " + reference.pmid + "." : ""} Available from: ${reference.url}`;
    try {
      await navigator.clipboard.writeText(vancouver);
      setCopiedCitation(id);
      setTimeout(() => setCopiedCitation(null), 2000);
    } catch {
      setError("Copy is unavailable in this browser.");
    }
  };
  const highlightText = (titleText, searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) return titleText;
    const safe = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${safe})`, "gi");
    const parts = String(titleText || "").split(regex);
    if (parts.length <= 1) return titleText;
    return parts.map((part, i) => regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part);
  };
  const copyClinicalSummary = async (message, index) => {
    const prevUser = index > 0 && messages[index - 1]?.isUser ? messages[index - 1].text : "User Inquiry";
    const refText = message.references?.length
      ? "\n\nREFERENCES:\n" + message.references.map((r, i) => {
          const authors = Array.isArray(r.authors) && r.authors.length ? r.authors.slice(0, 3).join(", ") + (r.authors.length > 3 ? ", et al" : "") : "Author not listed";
          return `[${i + 1}] ${authors}. ${r.title} ${r.journal || ""} ${r.pubdate || ""}. PMID: ${r.pmid || "N/A"}. URL: ${r.url || ""}`;
        }).join("\n")
      : "";
    const ddiText = message.verification?.drugInteractions?.length
      ? "\n\nPOSSIBLE MEDICATION INTERACTIONS MENTIONED:\n" + message.verification.drugInteractions.map((d) => `${d.pair}: ${d.description}\nCheck with a pharmacist or prescriber. Do not change medicines based on this app.`).join("\n\n")
      : "";
    const formatted = `[MEDASSIST AI - EDUCATIONAL CHAT SUMMARY]
Timestamp: ${message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString()}
Evidence Status: ${labels[message.verification?.status] || message.verification?.status || "General Guidance"} (Non-clinical educational information)

QUERY:
${prevUser}

ASSISTANT RESPONSE:
${message.text}${ddiText}${refText}

DISCLAIMER:
Educational guidance only. This consultation does not establish a doctor-patient relationship, nor constitute diagnostic or prescribing advice. Discuss care decisions with a licensed medical professional.`;

    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedSummary(message.id || index);
      setTimeout(() => setCopiedSummary(null), 2000);
    } catch {
      setError("Copy is unavailable in this browser.");
    }
  };
  const jumpToRef = (messageKey, refNum) => {
    const el = document.getElementById("ref-" + messageKey + "-" + refNum);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      el.classList.add("citation-target-highlight");
      el.focus?.({ preventScroll: true });
      setTimeout(() => el.classList.remove("citation-target-highlight"), 2200);
    }
  };
  const renderMessageProse = (message, messageKey) => {
    const references = message.references;
    if (!references || !references.length) {
      return <ReactMarkdown components={safeMessageComponents}>{message.text}</ReactMarkdown>;
    }
    const components = {
      ...safeMessageComponents,
      p: ({ children }) => {
        const renderNode = (child, idx) => {
          if (typeof child !== "string") return child;
          const parts = child.split(/(\[\d+(?:\s*(?:[-–]|,)\s*\d+)*\])/g);
          if (parts.length <= 1) return child;
          return parts.map((part, pIdx) => {
            const bracketMatch = part.match(/^\[(.*)\]$/);
            if (!bracketMatch) return part;
            const inner = bracketMatch[1];
            const nums = [];
            for (const piece of inner.split(",")) {
              const rangeMatch = piece.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
              if (rangeMatch) {
                const start = Number(rangeMatch[1]);
                const end = Number(rangeMatch[2]);
                if (start <= end && end - start <= 10) {
                  for (let i = start; i <= end; i++) nums.push(i);
                } else {
                  nums.push(start, end);
                }
              } else {
                const n = Number(piece.trim());
                if (Number.isInteger(n)) nums.push(n);
              }
            }
            if (!nums.length) return part;
            return (
              <span key={"cite-group-" + idx + "-" + pIdx} className="citation-group">
                {nums.map((num) => {
                  const ref = references[num - 1];
                  return (
                    <button
                      key={"cite-" + num}
                      type="button"
                      className="citation-pill"
                      title={ref ? ref.title + " (" + (ref.journal || "PubMed") + ")" : "PubMed record [" + num + "]"}
                      onClick={() => jumpToRef(messageKey, num)}
                    >
                      [{num}]
                    </button>
                  );
                })}
              </span>
            );
          });
        };
        return <p>{Array.isArray(children) ? children.map(renderNode) : renderNode(children, 0)}</p>;
      },
    };
    return <ReactMarkdown components={components}>{message.text}</ReactMarkdown>;
  };
  const activeTitle = sessions.find((session) => session.id === active)?.title || activeName || (active ? "Conversation" : "New conversation");
  const navigationLocked = busy || loadingChat || !!pending;
  const sortedSessions = [...sessions].sort((a, b) => {
    if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  const filteredSessions = sortedSessions.filter((session) => {
    if (historyFilter === "pinned") return session.isPinned;
    if (historyFilter === "medical") return session.isMedical;
    return true;
  });
  return <main className="chat-page">
    <div className="chat-toolbar"><div className="chat-toolbar-main"><button ref={historyToggle} className="button secondary small mobile-only" onClick={() => setSidebarOpen((value) => !value)} aria-expanded={sidebarOpen} aria-controls="chat-history">History</button><div><span className="eyebrow">YOUR WORKSPACE</span><h1>Health Q&amp;A</h1></div></div><span className={"connection-status " + (online ? "is-online" : "")} role="status">{online ? "Live updates connected" : "Live updates reconnecting"}</span></div>
    <div className="chat-layout">
      <aside id="chat-history" ref={drawer} className={"history card " + (sidebarOpen ? "is-open" : "")} role={sidebarOpen ? "dialog" : undefined} aria-label="Conversation history" onKeyDown={(event) => { if (event.key === "Escape") setSidebarOpen(false); }}>
        <div className="row-between"><h2>Conversations</h2><button className="text-button mobile-only" onClick={() => setSidebarOpen(false)}>Close</button></div>
        <button className="button full-width" onClick={newChat} disabled={navigationLocked}>New conversation</button>
        <button type="button" className="button secondary full-width" style={{ marginTop: "6px" }} onClick={() => importFileInput.current?.click()} disabled={navigationLocked} title="Preview a conversation JSON file locally without saving it to your account">Preview conversation JSON</button>
        <input ref={importFileInput} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleImportFile} aria-label="Choose conversation JSON" />
        <label className="search-label" htmlFor="history-search">Search history</label>
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
        </div>
        {sessions.length > 0 && (
          <div className="history-filter-bar">
            <button
              type="button"
              className={`filter-pill ${historyFilter === "all" ? "active" : ""}`}
              onClick={() => setHistoryFilter("all")}
            >
              All ({sessions.length})
            </button>
            {sessions.some((s) => s.isPinned) && (
              <button
                type="button"
                className={`filter-pill ${historyFilter === "pinned" ? "active" : ""}`}
                onClick={() => setHistoryFilter("pinned")}
              >
                📌 Pinned ({sessions.filter((s) => s.isPinned).length})
              </button>
            )}
            {sessions.some((s) => s.isMedical) && (
              <button
                type="button"
                className={`filter-pill ${historyFilter === "medical" ? "active" : ""}`}
                onClick={() => setHistoryFilter("medical")}
              >
                PubMed ({sessions.filter((s) => s.isMedical).length})
              </button>
            )}
          </div>
        )}
        {historyBusy && <p role="status" className="muted">Loading history...</p>}
        {!historyBusy && !filteredSessions.length && <p className="muted">{query ? "No conversations match your search." : historyFilter !== "all" ? "No conversations match this filter." : "Your saved conversations will appear here."}</p>}
        <ul className="session-list">{filteredSessions.map((session) => <li key={session.id} className={active === session.id ? "selected" : ""}>
          {editing === session.id ? <form onSubmit={rename}><label>Conversation title<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} autoFocus /></label><div className="actions"><button className="button small">Save title</button><button type="button" className="button secondary small" onClick={() => setEditing(null)}>Cancel</button></div></form> : <>
            <button className="session-title" onClick={() => loadChat(session.id)} disabled={navigationLocked} aria-current={active === session.id ? "true" : undefined}>{highlightText(session.title, query)}</button>
            <time className="small-text muted">{session.isPinned ? "📌 Pinned · " : ""}{new Date(session.timestamp).toLocaleDateString()}</time>
            <div className="session-actions"><button type="button" onClick={() => togglePin(session)} disabled={navigationLocked}>{session.isPinned ? "Unpin" : "Pin"}</button><button onClick={() => { setEditing(session.id); setTitle(session.title); }} disabled={navigationLocked}>Rename</button><button onClick={() => exportChat(session)}>Export</button><button className="danger-text" disabled={navigationLocked} onClick={() => { setDeleting(session); deleteDialog.current.showModal(); }}>Delete</button></div>
          </>}
        </li>)}</ul>
        {cursor && <button className="button secondary full-width" onClick={() => loadHistory(cursor)} disabled={historyBusy}>Load older conversations</button>}
        <div className="row-between" style={{ marginTop: "12px" }}>
          <button className="text-button" onClick={() => loadHistory()} disabled={historyBusy}>Refresh history</button>
          {sessions.length > 0 && <button className="text-button danger-text" onClick={() => clearAllDialog.current?.showModal()} disabled={navigationLocked}>Clear all</button>}
        </div>
      </aside>
      <section className="conversation card" aria-label="Chat workspace" inert={sidebarOpen}>
        <div className="conversation-heading">
          <div className="row-between">
            <h2>{importPreview ? "Local preview · " : ""}{activeTitle}</h2>
            <div className="actions" style={{ margin: 0 }}>
              <button type="button" className="text-button small-text" onClick={() => setCalcModalOpen(true)} title="Open clinical reference calculators (BMI, eGFR, CHA2DS2-VASc, MAP, CrCl, Ca, Anion Gap, FeNa) (Alt+C)" aria-keyshortcuts="Alt+C">Clinical tools</button>
              {messages.length > 0 && (
                <>
                  <button className="text-button small-text" onClick={exportActiveMarkdown} title={importPreview ? "Export an unverified local preview as Markdown" : "Export as structured Markdown document"}>{importPreview ? "Export preview Markdown" : "Export Markdown"}</button>
                  <button className="text-button small-text" onClick={exportActiveJson} title={importPreview ? "Export an unverified local preview as JSON" : "Export structured conversation as JSON"}>{importPreview ? "Export preview JSON" : "Export JSON"}</button>
                  <button className="text-button small-text" onClick={() => window.print()} title="Print or save as PDF">Print</button>
                </>
              )}
            </div>
          </div>
          {!importPreview && <p className="muted small-text">Educational information. Avoid personal details. Open source links from the PubMed records below answers.</p>}
        </div>
        {importPreview && <div className="notice" role="status">Local preview only: not saved to your account or used as AI context. Imported citations and verification are ignored. <button type="button" className="text-button" onClick={() => { newChat(); composerInput.current?.focus(); }}>Start a new conversation</button> to ask a question.</div>}
        {!isBrowserOnline && (
          <div className="offline-banner" role="status">
            You appear to be offline. Medical questions and searches require an active network connection.
          </div>
        )}
        {loadingChat && <p className="notice" role="status">Loading conversation...</p>}
        {recovered?.exchangeId === pending?.exchangeId && pending && !busy && !error && <div className="notice" role="status">Your unfinished message was recovered from this tab. <button className="text-button" onClick={() => send(null, pending)}>{pending.result ? "Retry saving" : "Retry message"}</button></div>}
        {error && <div className="notice error" role="alert">{error}{pending && <div className="actions"><button className="button small" disabled={busy} onClick={() => send(null, pending)}>{pending.result ? "Retry saving" : "Retry message"}</button>{pending.result && <button className="button secondary small" onClick={() => downloadJson("medassist-unsaved-answer.json", pending.result)}>Export answer</button>}</div>}</div>}
        <div className="messages" ref={messagesPane} aria-label="Messages" aria-live="polite" aria-relevant="additions text">
          {!messages.length && <div className="empty-chat"><span className="empty-icon" aria-hidden="true">?</span><h3>Ask a health question</h3><p>Explore a topic, then review the sources and evidence label.</p><div className="suggestions">{[["Migraine triggers", "What are common migraine triggers?"], ["Asthma symptoms", "What are the symptoms of asthma?"], ["High blood pressure", "What is high blood pressure?"]].map(([label, suggestion]) => <button className="button secondary small" key={label} onClick={() => { setPrompt(suggestion); composerInput.current?.focus(); }}>{label}</button>)}</div></div>}
          {messages.map((message, index) => <article className={"message " + (message.isUser ? "user-message" : "assistant-message")} key={message.id || index}>
            <div className="message-byline"><strong>{message.isUser ? "You" : importPreview ? "Imported answer · unverified" : "MedAssist AI"}</strong>{message.timestamp && <time>{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}</div>
            <div className="prose">{renderMessageProse(message, message.id || index)}</div>
            {!message.isUser && message.verification?.drugInteractions?.length > 0 && (
              <div className="drug-alert-card" role="alert">
                <div className="drug-alert-header">
                  <span className="drug-alert-icon" aria-hidden="true">⚠️</span>
                  <strong>Possible medication interaction mentioned ({message.verification.drugInteractions.length})</strong>
                </div>
                <p className="small-text">This checks drug names in your question, not your medication list. It cannot confirm whether an interaction applies to you.</p>
                {message.verification.drugInteractions.map((item, dIdx) => (
                  <div key={dIdx} className="drug-alert-item">
                    <div className="drug-alert-title-row">
                      <strong className="drug-pair-name">{item.pair}</strong>
                    </div>
                    <p className="drug-alert-desc">{item.description}</p>
                  </div>
                ))}
                <p className="drug-alert-rec">Check with a pharmacist or prescriber before using these medicines together. Do not start, stop, or change prescribed medicines based on this screen.</p>
              </div>
            )}
            {!message.isUser && <div className="answer-actions">
              <button className="text-button" onClick={() => copyAnswer(message, index)}>{importPreview ? "Copy imported text" : "Copy answer"}</button>
              {copied === (message.id || index) && <span className="small-text muted" role="status">{importPreview ? "Imported text copied" : "Answer copied"}</span>}
              {!importPreview && <button type="button" className="text-button" onClick={() => copyClinicalSummary(message, index)}>{copiedSummary === (message.id || index) ? "Summary copied" : "Copy summary"}</button>}
              {!importPreview && typeof window !== "undefined" && "speechSynthesis" in window && (
                <button className="text-button" onClick={() => toggleSpeech(message, message.id || index)}>
                  {speakingId === (message.id || index) ? "Stop listening" : "Listen to answer"}
                </button>
              )}
              {!importPreview && index > 0 && messages[index - 1]?.isUser && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setPrompt(messages[index - 1].text);
                    composerInput.current?.focus();
                  }}
                  title="Load this question back into the composer to edit or re-ask"
                >
                  Edit question
                </button>
              )}
            </div>}
            {!message.isUser && message.verification?.status && <p className="badge">{labels[message.verification.status] || message.verification.status.replaceAll("_", " ")}</p>}
            {!message.isUser && message.verification?.status === "citation_checked" && <p className="muted small-text">{message.verification.modelReview === "supported" ? "Citation numbers match supplied sources; a separate AI review found support. This is not clinical verification." : "Citation numbers match supplied sources. Claims have not been independently verified."}{message.verification?.sourceCount > 0 && <span> · {message.verification.validCitationCount || 0} of {message.verification.sourceCount} PubMed records cited ({message.verification.citationCoverage || 0}% coverage)</span>}</p>}
            {!!message.references?.length && <div className="references" id={"references-" + (message.id || index)}><strong>PubMed records</strong><ol>{message.references.map((reference, i) => {
              const refKey = (message.id || index) + "-" + (i + 1);
              return <li id={"ref-" + refKey} key={reference.pmid || i} tabIndex={-1} aria-label={"Reference " + (i + 1)}>
                {/^https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/\d+\/?$/.test(reference.url) ? <a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.title}</a> : reference.title}
                <span className="muted"> · {reference.journal} {reference.pubdate}</span>
                <span className="reference-actions"> · <button type="button" className="text-button small-text" onClick={() => copyCitation(reference, refKey)}>{copiedCitation === refKey ? "Citation copied" : "Cite"}</button></span>
              </li>;
            })}</ol></div>}
          </article>)}
          {busy && <p className="answer-progress" role="status">{status}</p>}
        </div>
        <form onSubmit={send} className="composer">
          <label htmlFor="chat-prompt">Your question</label><textarea ref={composerInput} id="chat-prompt" rows={2} maxLength={4000} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={importPreview ? "Start a new conversation to ask a question" : "Ask about a condition, symptom, or health topic..."} disabled={busy || loadingChat || importPreview} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} />
          <div className="row-between"><span className="muted small-text">{prompt.length}/4000{!importPreview && prompt.trim().length > 3 && isMedicalQuery(prompt) && <span className="grounding-hint"> · PubMed active</span>}<span className="shortcut-hint"> · Shift + Enter for a new line</span></span><button className="button" disabled={busy || loadingChat || importPreview || !prompt.trim() || !!pending}>{busy || loadingChat ? "Please wait..." : "Send question"}</button></div>
          {pending && !busy && <button type="button" className="text-button" onClick={() => { setPrompt(pending.prompt); setPending(null); setMessages((old) => old.filter((item) => !item.id?.startsWith(pending.exchangeId))); setError(""); }}>Return message to draft</button>}
          {!error && !busy && status && <span className="small-text muted" role="status">{status === "Saved" ? "Conversation saved" : status}</span>}
        </form>
      </section>
    </div>
    <dialog ref={deleteDialog} aria-labelledby="delete-chat-title" onCancel={() => setDeleting(null)}><h2 id="delete-chat-title">Delete this conversation?</h2><p>{deleting?.title}</p><p>This permanently removes the conversation from your account. Export it first if you need a copy.</p><div className="actions"><button className="button danger" onClick={remove} disabled={deletingBusy}>{deletingBusy ? "Deleting..." : "Delete conversation"}</button><button className="button secondary" disabled={deletingBusy} onClick={() => { deleteDialog.current.close(); setDeleting(null); }}>Keep conversation</button></div></dialog>
    <dialog ref={clearAllDialog} aria-labelledby="clear-all-title" onCancel={() => {}}><h2 id="clear-all-title">Clear all conversations?</h2><p>This permanently deletes all saved conversation history from your account. This action cannot be undone.</p><div className="actions"><button className="button danger" onClick={clearAll} disabled={deletingBusy}>{deletingBusy ? "Clearing..." : "Delete all history"}</button><button className="button secondary" disabled={deletingBusy} onClick={() => clearAllDialog.current?.close()}>Cancel</button></div></dialog>
    <ClinicalCalculatorsModal isOpen={calcModalOpen} onClose={() => setCalcModalOpen(false)} onInsertPrompt={(text) => { if (importPreview) newChat(); setPrompt(text); composerInput.current?.focus(); }} />
  </main>;
}
