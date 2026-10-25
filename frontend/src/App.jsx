/**
 * ============================================================================
 * MEDASSIST AI - REACT APPLICATION ROOT & CHAT ENGINE (App.jsx)
 * ============================================================================
 * Role:
 *   Core frontend controller managing client-side routing, conversation state,
 *   real-time WebSocket synchronization, evidence-grounded chat submissions,
 *   markdown rendering, session lifecycle management (CRUD), and UI layout.
 *
 * Architecture Highlights:
 *   - Client-Side Query Routing: Evaluates submitted prompts with `isMedicalQuery`.
 *     Medical prompts target `/api/medical` for PubMed grounding; general queries
 *     target `/api/ai/chat` (with automatic fallback if medical service fails).
 *   - Real-Time WebSocket Sync: Subscribes to `/ws` with exponential backoff
 *     reconnection logic (1s up to 30s) to receive server-pushed "CHAT_UPDATE"
 *     actions (NEW, UPDATE, RENAME, DELETE) without polling.
 *   - Chat Session Management: Handles session creation, date grouping (Today,
 *     Yesterday, Last 5 Days, Previous), JSON conversation export, in-place title
 *     renaming, and confirmed deletion.
 *   - Markdown & Citations: Employs `react-markdown` with customized lists, code
 *     blocks, clickable PubMed bibliography links, and verification status badges.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: APP COMPONENT & CHAT WORKSPACE
 * ----------------------------------------------------------------------------
 * [App.jsx Component Root]
 *   │
 *   ├── 1. Client Routing (BrowserRouter & Routes)
 *   │     ├── /               ──► Redirects to /chat (if user) or renders <Home />
 *   │     ├── /login          ──► <Login />
 *   │     ├── /register       ──► <Register />
 *   │     ├── /dashboard      ──► <AnalyticsDashboard />
 *   │     ├── Auth Flows      ──► /verify-email, /forgot-password, /reset-password
 *   │     └── /chat           ──► Main MedAssist Chat Workspace
 *   │
 *   ├── 2. WebSocket Real-Time Synchronization
 *   │     ├── Initializes ws connection to getWebSocketUrl() on user login
 *   │     ├── Handles CHAT_UPDATE events:
 *   │     │     ├── "NEW" / "UPDATE" ──► Inserts or updates session in chatSessions list
 *   │     │     ├── "RENAME"         ──► Updates title in session list
 *   │     │     └── "DELETE"         ──► Filters out deleted session from list
 *   │     └── On disconnect: initiates exponential backoff reconnect loop
 *   │
 *   ├── 3. Query Submission Lifecycle (handleSubmit)
 *   │     ├── Step 1: Appends optimistic user message to local state
 *   │     ├── Step 2: Evaluates isMedicalQuery(prompt)
 *   │     ├── Step 3: If medical: POST /api/medical (PubMed grounding)
 *   │     ├── Step 4: If general or fallback: POST /api/ai/chat (Gemini)
 *   │     ├── Step 5: Appends bot response with bibliography and verification metadata
 *   │     └── Step 6: Calls POST /api/save to persist exchange to MongoDB
 *   │
 *   └── 4. Chat Management Handlers
 *         ├── handleNewChat: Clears active session and message list
 *         ├── handleLoadChat: Loads historical messages for selected session
 *         ├── handleRenameChat: Emits PATCH /api/chats/:sessionId
 *         ├── handleDeleteChat: Emits DELETE /api/delete with confirmed modal
 *         └── handleExportChat: Generates downloadable JSON transcript
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: DUAL-PATH PROMPT PROCESSING & WEBSOCKET SYNC
 * ----------------------------------------------------------------------------
 *  [User Enters Prompt in Chat Input]
 *                 │
 *                 ▼
 *  (isMedicalQuery(prompt) === true?)
 *                 │
 *        ┌────────┴────────────────────────────┐
 *        ▼                                     ▼
 *      [Yes]                                  [No]
 *        │                                     │
 *        ▼                                     ▼
 *  POST /api/medical                    POST /api/ai/chat
 *  (PubMed Search + Summary)            (General Gemini Chat)
 *        │                                     │
 *        ├─ [On failure] ──► Fallback to AI    │
 *        │                                     │
 *        └──────────────────┬──────────────────┘
 *                           │
 *                           ▼
 *  [Render Markdown Response + PubMed Links + Verification Badge]
 *                           │
 *                           ▼
 *  POST /api/save (Persist prompt, response, refs, verification)
 *                           │
 *                           ▼
 *  Server Emits WebSocket "CHAT_UPDATE" Event ──► Real-time Sidebar Sync
 * ============================================================================
 */
import {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { SidebarContext } from "./context/SidebarContext";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import Register from "./components/Register";
import { AuthContext } from "./context/AuthContext";
import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";
import Home from "./components/home/Home";
import { isMedicalQuery } from "./utils/medicalDetector";
import VerificationPending from "./components/auth/VerificationPending";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import VerifyEmail from "./components/auth/VerifyEmail";
import ReactMarkdown from "react-markdown";
import AnalyticsDashboard from "./components/dashboard/AnalyticsDashboard";
import { apiRequest, getWebSocketUrl } from "./lib/api";

const verificationLabels = {
  citation_checked: "Citations checked",
  invalid_citations: "Citation issue detected",
  sources_supplied: "Sources supplied",
  references_only: "References only",
  generated: "AI generated",
  safety_redirect: "Safety response",
};

const App = () => {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    saving: false,
    deleting: false,
    loadingChat: false,
    creatingChat: false,
  });
  const [deletingSessionIds, setDeletingSessionIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isNewChat, setIsNewChat] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const messagesEndRef = useRef(null);
  const { sidebarOpen, setSidebarOpen } = useContext(SidebarContext);
  const { user, isAuthLoading } = useContext(AuthContext);
  const maxMessagesPerSession = 1000;
  const wsReconnectAttempts = useRef(0);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const activeSessionIdRef = useRef(null);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * Normalizes raw database message schemas into client message entities.
   * Expands (prompt, response) pairs into consecutive (user, bot) UI message objects.
   */
  const processMessages = useCallback((chatMessages) => {
    const processed = [];
    if (Array.isArray(chatMessages)) {
      chatMessages.forEach((msg) => {
        if (msg.prompt) {
          processed.push({
            text: msg.prompt,
            isUser: true,
            timestamp: msg.timestamp || new Date().toISOString(),
            isMedical: msg.isMedical || false,
          });
        }
        if (msg.response) {
          processed.push({
            text: msg.response,
            isUser: false,
            timestamp: msg.timestamp || new Date().toISOString(),
            isMedical: msg.isMedical || false,
            references: msg.references || [],
            verification: msg.verification,
          });
        }
        if (msg.text) {
          processed.push({
            text: msg.text,
            isUser: msg.isUser || false,
            timestamp: msg.timestamp || new Date().toISOString(),
            isMedical: msg.isMedical || false,
            references: msg.references || [],
            verification: msg.verification,
          });
        }
      });
    }
    return processed;
  }, []);

  /**
   * Fetches user's saved chat sessions from GET /api/history and populates sidebar state.
   */
  const fetchChatHistory = useCallback(async () => {
    try {
      const data = await apiRequest("/history");

      if (Array.isArray(data)) {
        const history = data
          .map((chat) => {
            if (!chat || typeof chat !== "object") {
              return null;
            }

            const chatId = chat.sessionId || chat._id || chat.id;
            if (!chatId) {
              return null;
            }

            const messages = processMessages(chat.messages);
            if (messages.length > 0) {
              return {
                id: chatId,
                sessionId: chatId,
                messages: messages,
                timestamp:
                  chat.updatedAt || chat.createdAt || new Date().toISOString(),
                title:
                  chat.title || messages[0]?.text?.slice(0, 30) || "New Chat",
                isMedical: chat.isMedical || false,
              };
            }
            return null;
          })
          .filter(Boolean);

        setChatSessions(history);
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      setChatSessions([]);
    }
  }, [processMessages]);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setChatSessions([]);
      return;
    }

    fetchChatHistory();

    let shouldReconnect = true;

    const setupWebSocket = () => {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionError(false);
        wsReconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "CHAT_UPDATE") {
            if (["SAVE", "NEW", "UPDATE"].includes(message.data.action)) {
              if (message.data.chat.id !== activeSessionIdRef.current) {
                setChatSessions((prev) => {
                  const chat = message.data.chat;
                  const chatId = chat.sessionId || chat._id || chat.id;

                  if (!chatId) {
                    return prev;
                  }

                  const messages = processMessages(chat.messages);
                  if (messages.length === 0) {
                    return prev;
                  }

                  const processedChat = {
                    id: chatId,
                    sessionId: chatId,
                    messages: messages,
                    timestamp:
                      chat.updatedAt ||
                      chat.createdAt ||
                      new Date().toISOString(),
                    title:
                      chat.title ||
                      messages[0]?.text?.slice(0, 30) ||
                      "New Chat",
                    isMedical: chat.isMedical || false,
                  };

                  const exists = prev.some(
                    (c) => c.id === chatId || c.sessionId === chatId
                  );
                  if (exists) {
                    return prev.map((c) =>
                      c.id === chatId || c.sessionId === chatId
                        ? processedChat
                        : c
                    );
                  } else {
                    return [processedChat, ...prev];
                  }
                });
              }
            } else if (message.data.action === "DELETE") {
              const sessionIdToDelete = message.data.sessionId;
              if (!sessionIdToDelete) {
                return;
              }

              setChatSessions((prev) =>
                prev.filter(
                  (c) =>
                    c.id !== sessionIdToDelete &&
                    c.sessionId !== sessionIdToDelete
                )
              );
            } else if (message.data.action === "RENAME") {
              setChatSessions((prev) =>
                prev.map((session) =>
                  (session.sessionId || session.id) === message.data.sessionId
                    ? { ...session, title: message.data.title }
                    : session
                )
              );
            }
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionError(true);
      };

      ws.onclose = () => {
        setConnectionError(true);

        const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts.current), 30000);
        if (!shouldReconnect) return;
        reconnectTimerRef.current = setTimeout(() => {
          wsReconnectAttempts.current += 1;
          setupWebSocket();
        }, delay);
      };
    };

    setupWebSocket();
    return () => {
      shouldReconnect = false;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [user, fetchChatHistory, processMessages]);

  /**
   * Primary chat submission orchestrator:
   * 1. Evaluates isMedicalQuery(prompt)
   * 2. Routes to POST /api/medical (PubMed grounding) or POST /api/ai/chat (Gemini)
   * 3. Appends markdown response, references, and verification audit
   * 4. Persists exchange via POST /api/save and refreshes history
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!prompt.trim()) return;

    if (messages.length >= maxMessagesPerSession * 2) {
      alert("Chat limit reached. Please start a new chat.");
      return;
    }

    const submittedPrompt = prompt.trim();
    const userMessage = {
      text: submittedPrompt,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setPrompt("");
    setIsLoading(true);

    try {
      let botReply;
      let references = [];
      let verification;
      const isMedical = isMedicalQuery(submittedPrompt);
      let shouldUseGeneralAi = !isMedical;
      let usedMedicalGrounding = false;

      if (isMedical) {
        try {
          const medicalData = await apiRequest("/medical", {
            method: "POST",
            body: JSON.stringify({ prompt: submittedPrompt }),
          });
          botReply = medicalData.text;
          references = medicalData.references || [];
          verification = medicalData.verification;
          usedMedicalGrounding = references.length > 0;
        } catch (medicalError) {
          console.warn("Medical API failed:", medicalError.message);
          shouldUseGeneralAi = true;
        }
      }

      if (shouldUseGeneralAi || !botReply) {
        const data = await apiRequest("/ai/chat", {
          method: "POST",
          body: JSON.stringify({ prompt: submittedPrompt }),
        });
        botReply = data.text || "I couldn't generate a response. Please try again.";
        verification = data.verification;
        botReply = formatGeminiResponse(botReply);
      }

      const botMessage = {
        text: botReply,
        isUser: false,
        timestamp: new Date().toISOString(),
        isMedical: usedMedicalGrounding,
        references,
        verification,
      };

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);

      setLoadingStates((prev) => ({ ...prev, saving: true }));
      const saveData = await apiRequest("/save", {
        method: "POST",
        body: JSON.stringify({
          prompt: userMessage.text,
          response: botReply,
          sessionId: activeSessionId || null,
          isMedical: usedMedicalGrounding,
          references,
          verification,
        }),
      });
      if (saveData.isNew) {
        setActiveSessionId(saveData.sessionId);
      }
      setIsNewChat(false);
      await fetchChatHistory();
    } catch (error) {
      console.error("Error:", error);
      setError({
        message: "Failed to send message",
        details: error.message,
        retry: () => {
          setPrompt(submittedPrompt);
          setError(null);
        },
      });
    } finally {
      setIsLoading(false);
      setLoadingStates((prev) => ({ ...prev, saving: false }));
    }
  };

  const formatGeminiResponse = (text) => {
    text = text.replace(/^[•●○]/gm, "-"); 
    text = text.replace(/\b(Note|Important|Warning):/g, "**$1:**");

    text = text.replace(/```(\w+)?\n([\s\S]+?)\n```/g, (_, lang, code) => {
      return `\n\`\`\`${lang || ""}\n${code.trim()}\n\`\`\`\n`;
    });

    return text;
  };

  /**
   * Delete a chat session with optimistic tracking and active session cleanup.
   *
   * Mindmap Flow:
   * ```
   * [handleDeleteChat]
   *        │
   *        ├── 1. Validation (resolve actualSessionId; reject if missing)
   *        ├── 2. Deleting Set Registration (add to deletingSessionIds for spinner)
   *        ├── 3. API Dispatch (DELETE /api/delete with { sessionId })
   *        ├── 4. State Pruning (filter out deleted session from chatSessions)
   *        ├── 5. Active Session Reset (if active, clear messages & activate new chat)
   *        └── 6. Cleanup (remove from deletingSessionIds in finally)
   * ```
   *
   * Sequence Flow:
   * ```
   * User Click           App.jsx                      Backend API              MongoDB
   *      │                  │                              │                      │
   *      │── Delete click ─>│                              │                      │
   *      │                  ├─ setDeletingSessionIds       │                      │
   *      │                  ├─ DELETE /api/delete ────────>│                      │
   *      │                  │                              ├─ findOneAndDelete ──>│
   *      │                  │<─ 200 OK Deleted ────────────┤                      │
   *      │                  ├─ setChatSessions(filtered)   │                      │
   *      │                  ├─ reset active session        │                      │
   *      │<── UI updated ───┤                              │                      │
   * ```
   *
   * @param {string} sessionId Unique chat session identifier to delete.
   * @returns {Promise<void>}
   */
  const handleDeleteChat = async (sessionId) => {
    if (!sessionId) {
      console.error("No sessionId provided for deletion");
      setError({
        message: "Failed to delete chat",
        details: "No session ID provided",
      });
      return;
    }

    const sessionToDelete = chatSessions.find(
      (session) => session.id === sessionId || session.sessionId === sessionId
    );

    if (!sessionToDelete) {
      console.error("Session not found with ID:", sessionId);
      setError({
        message: "Failed to delete chat",
        details: "Chat session not found",
      });
      return;
    }

    const actualSessionId = sessionToDelete.sessionId || sessionToDelete.id;
    setDeletingSessionIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(actualSessionId);
      return newSet;
    });

    try {
      await apiRequest("/delete", {
        method: "DELETE",
        body: JSON.stringify({
          sessionId: actualSessionId,
        }),
      });

      setChatSessions((prev) => {
        const updatedSessions = prev.filter(
          (s) => s.id !== actualSessionId && s.sessionId !== actualSessionId
        );
        return updatedSessions;
      });

      if (activeSessionId === actualSessionId) {
        setMessages([]);
        setActiveSessionId(null);
        setIsNewChat(true);
      }

    } catch (error) {
      console.error("Error deleting chat:", error);
      setError({
        message: "Failed to delete chat",
        details: error.message,
        retry: () => handleDeleteChat(sessionId),
      });
    } finally {
      setDeletingSessionIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(actualSessionId);
        return newSet;
      });
    }
  };

  /**
   * Rename an existing conversation title and sync across state and backend.
   *
   * Mindmap Flow:
   * ```
   * [handleRenameChat]
   *        │
   *        ├── 1. API Call (PATCH /api/chats/:id with { title })
   *        ├── 2. State Mutation (update matching session.title in chatSessions)
   *        └── 3. Error Recovery (display error banner if patch fails)
   * ```
   *
   * Sequence Flow:
   * ```
   * User Edit            App.jsx                      Backend API              MongoDB
   *      │                  │                              │                      │
   *      │── Submit title ─>│                              │                      │
   *      │                  ├─ PATCH /api/chats/:id ──────>│                      │
   *      │                  │                              ├─ findOneAndUpdate ──>│
   *      │                  │<─ 200 OK { title } ──────────┤                      │
   *      │                  ├─ map updated title in state  │                      │
   *      │<── UI updated ───┤                              │                      │
   * ```
   *
   * @param {string} sessionId Session to rename.
   * @param {string} title New title text.
   * @returns {Promise<void>}
   */
  const handleRenameChat = async (sessionId, title) => {
    try {
      const data = await apiRequest(`/chats/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      setChatSessions((prev) =>
        prev.map((session) =>
          (session.sessionId || session.id) === sessionId
            ? { ...session, title: data.title }
            : session
        )
      );
    } catch (renameError) {
      setError({
        message: "Failed to rename chat",
        details: renameError.message,
      });
    }
  };

  /**
   * Export the complete conversation transcript as a formatted JSON file download.
   *
   * Mindmap Flow:
   * ```
   * [handleExportChat]
   *        │
   *        ├── 1. Payload Assembly (exportedAt, title, sessionId, normalized messages)
   *        ├── 2. Blob Construction (Blob([JSON.stringify(payload)], type: application/json))
   *        ├── 3. DOM Anchor Synthesis (URL.createObjectURL -> anchor download trigger)
   *        └── 4. Memory Reclamation (URL.revokeObjectURL(url))
   * ```
   *
   * Sequence Flow:
   * ```
   * User Click           App.jsx                      Browser DOM / Blob
   *      │                  │                                  │
   *      │── Export click ─>│                                  │
   *      │                  ├─ processMessages(session)        │
   *      │                  ├─ new Blob([json], { application/json })
   *      │                  ├─ URL.createObjectURL(blob) ─────>│
   *      │                  ├─ <a download="chat.json">.click()│
   *      │                  ├─ URL.revokeObjectURL(url) ──────>│ (reclaimed)
   *      │<── Downloaded ───┤                                  │
   * ```
   *
   * @param {object} session Chat session object to serialize.
   * @returns {void}
   */
  const handleExportChat = (session) => {
    const title = session.title || "medassist-chat";
    const payload = {
      exportedAt: new Date().toISOString(),
      title,
      sessionId: session.sessionId || session.id,
      messages: processMessages(session.messages),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "medassist-chat"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Group sessions into temporal chronological buckets: Today, Yesterday, Last 5 Days, Previous.
   *
   * Mindmap Flow:
   * ```
   * [groupChatSessionsByDate]
   *        │
   *        ├── 1. Date Boundary Setup (today, yesterday, lastFiveDays thresholds)
   *        ├── 2. Chronological Sort (descending by session timestamp)
   *        ├── 3. Bucket Classification (Today | Yesterday | Last 5 Days | Previous)
   *        └── 4. Pruning (omit empty categories from returned dictionary)
   * ```
   *
   * @param {Array<object>} sessions Array of conversation session records.
   * @returns {Record<string, Array<object>>} Grouped session map.
   */
  const groupChatSessionsByDate = useCallback((sessions) => {
    const sessionsArray = Array.isArray(sessions) ? sessions : [];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastFiveDays = new Date(today);
    lastFiveDays.setDate(today.getDate() - 5);

    const groupedSessions = {
      Today: [],
      Yesterday: [],
      "Last 5 Days": [],
      Previous: [],
    };

    const sortedSessions = [...sessionsArray].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    sortedSessions.forEach((session) => {
      const sessionDate = new Date(session.timestamp);
      const sessionDateStr = sessionDate.toDateString();
      const todayStr = today.toDateString();
      const yesterdayStr = yesterday.toDateString();

      if (sessionDateStr === todayStr) {
        groupedSessions.Today.push(session);
      } else if (sessionDateStr === yesterdayStr) {
        groupedSessions.Yesterday.push(session);
      } else if (sessionDate > lastFiveDays) {
        groupedSessions["Last 5 Days"].push(session);
      } else {
        groupedSessions.Previous.push(session);
      }
    });

    Object.keys(groupedSessions).forEach((category) => {
      if (groupedSessions[category].length === 0) {
        delete groupedSessions[category];
      }
    });

    return groupedSessions;
  }, []);

  /**
   * Reset active conversation view to an empty new session slate.
   *
   * Mindmap Flow:
   * ```
   * [handleNewChat]
   *        │
   *        ├── 1. Clear Active Messages (setMessages([]))
   *        ├── 2. Reset Session Pointer (setActiveSessionId(null))
   *        └── 3. Flag New Slate (setIsNewChat(true))
   * ```
   *
   * @returns {void}
   */
  const handleNewChat = () => {
    setMessages([]);
    setActiveSessionId(null);
    setIsNewChat(true);
  };

  /**
   * Load historical conversation session into the active chat panel.
   *
   * Mindmap Flow:
   * ```
   * [handleLoadChat]
   *        │
   *        ├── 1. Integrity Check (verify session & session.messages exist)
   *        ├── 2. Message Normalization (processMessages to standardize schema)
   *        ├── 3. Active Session Switch (setActiveSessionId, setMessages)
   *        └── 4. Viewport Transition (setIsNewChat(false))
   * ```
   *
   * @param {object} session Conversation session object to mount.
   * @returns {void}
   */
  const handleLoadChat = (session) => {
    if (!session || !session.messages) {
      console.error("Invalid session data:", session);
      setError({
        message: "Failed to load chat",
        details: "Invalid chat session data",
      });
      return;
    }

    const sessionId = session.sessionId || session.id;
    const messages = processMessages(session.messages);

    setActiveSessionId(sessionId);
    setMessages(messages);
    setIsNewChat(false);
  };

  const groupedSessions = groupChatSessionsByDate(chatSessions);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex items-center gap-3" role="status" aria-live="polite">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          Restoring your session...
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Header />
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/chat" replace /> : <Home />}
        />
        <Route path="/login" element={user ? <Navigate to="/chat" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/chat" replace /> : <Register />} />
        <Route path="/verification-pending" element={<VerificationPending />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/chat"
          element={
            user ? (
              <div className="flex flex-col h-full min-h-screen bg-gray-900 text-white">
                <Sidebar
                  onNewChat={handleNewChat}
                  chatSessions={groupedSessions}
                  handleLoadChat={handleLoadChat}
                  handleDeleteChat={handleDeleteChat}
                  handleRenameChat={handleRenameChat}
                  handleExportChat={handleExportChat}
                  loadingStates={loadingStates}
                  deletingSessionIds={deletingSessionIds}
                  activeSessionId={activeSessionId}
                  isNewChat={isNewChat && messages.length === 0}
                />

                <div className="flex-1 flex flex-col">
                  <header className="sticky top-0 z-30 flex items-center justify-center border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur">
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="absolute left-4 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-500 hover:text-white"
                      aria-label={sidebarOpen ? "Close chat history" : "Open chat history"}
                    >
                      <span aria-hidden="true">☰</span>
                    </button>
                    <div className="text-center">
                      <p className="font-semibold text-white">Medical Q&amp;A Chat</p>
                      <p className="text-[11px] font-normal text-slate-500">Student project with PubMed sources</p>
                    </div>
                    {connectionError && (
                      <span className="absolute right-4 rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
                        Reconnecting
                      </span>
                    )}
                  </header>

                  {error && (
                    <div className="fixed bottom-4 right-4 bg-red-800 p-3 rounded-lg shadow-lg max-w-md z-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold">{error.message}</h3>
                          <p className="text-sm">{error.details}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {error.retry && (
                            <button
                              onClick={error.retry}
                              className="px-2 py-1 bg-red-700 rounded hover:bg-red-600"
                            >
                              Retry
                            </button>
                          )}
                          <button
                            onClick={() => setError(null)}
                            className="px-2 py-1 bg-gray-600 rounded hover:bg-gray-500"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto bg-slate-900" aria-live="polite">
                    <div className="max-w-4xl mx-auto p-4">
                      {messages.length === 0 && !isLoading ? (
                        <div className="mx-auto max-w-2xl py-16 text-center">
                          <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-blue-600 text-2xl font-bold text-white">
                            M
                          </div>
                          <h2 className="mt-5 text-2xl font-semibold text-white">Start a health conversation</h2>
                          <p className="mt-2 text-sm text-gray-400">
                            Medical questions are routed through PubMed grounding when relevant sources are available.
                          </p>
                          <div className="mt-6 flex flex-wrap justify-center gap-2">
                            {["Explain migraine warning signs", "How should I prepare for a doctor visit?", "Summarize my health question clearly"].map((suggestion) => (
                              <button
                                type="button"
                                key={suggestion}
                                onClick={() => setPrompt(suggestion)}
                                className="rounded-full border border-gray-700 bg-gray-800 px-4 py-2 text-xs text-gray-300 hover:border-cyan-600 hover:text-white"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        messages.map((message, i) => (
                          <div
                            key={`${message.timestamp}-${i}`}
                            className={`mb-4 ${message.isUser ? "text-right" : "text-left"}`}
                          >
                            <div
                            className={`inline-block max-w-3xl rounded-lg border p-4 text-left ${
                                message.isUser
                                  ? "border-blue-500 bg-blue-600 text-white"
                                  : message.isMedical
                                    ? "border-emerald-700 bg-slate-800 text-slate-200"
                                    : "border-slate-700 bg-slate-800 text-slate-200"
                              }`}
                            >
                              <div className="whitespace-pre-wrap prose prose-invert max-w-none">
                                <ReactMarkdown
                                  components={{
                                    // Custom components for better formatting
                                    p: ({ children }) => (
                                      <p className="mb-2">{children}</p>
                                    ),
                                    ul: ({ children }) => (
                                      <ul className="list-disc pl-4 mb-2">
                                        {children}
                                      </ul>
                                    ),
                                    ol: ({ children }) => (
                                      <ol className="list-decimal pl-4 mb-2">
                                        {children}
                                      </ol>
                                    ),
                                    li: ({ children }) => (
                                      <li className="mb-1">{children}</li>
                                    ),
                                    code: ({ inline, children }) =>
                                      inline ? (
                                        <code className="bg-gray-800 px-1 rounded">
                                          {children}
                                        </code>
                                      ) : (
                                        <pre className="bg-gray-800 p-2 rounded mt-2 mb-2 overflow-x-auto">
                                          <code>{children}</code>
                                        </pre>
                                      ),
                                  }}
                                >
                                  {message.text}
                                </ReactMarkdown>
                              </div>

                              {message.references &&
                                message.references.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-500">
                                    <h4 className="text-sm font-semibold mb-1">
                                      Medical References:
                                    </h4>
                                    <ul className="text-xs space-y-1">
                                      {message.references.map((ref, idx) => (
                                        <li key={idx}>
                                          <a
                                            href={ref.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-300 hover:underline"
                                          >
                                            {ref.title} ({ref.journal},{" "}
                                            {ref.pubdate})
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                              {!message.isUser && message.verification?.status && (
                                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3 text-[11px]">
                                  <span className="rounded-full bg-slate-950/50 px-2.5 py-1 text-slate-300">
                                    {verificationLabels[message.verification.status] || message.verification.status}
                                  </span>
                                  {Number.isFinite(message.verification.citationCoverage) && message.verification.sourceCount > 0 && (
                                    <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-cyan-200">
                                      {message.verification.citationCoverage}% source coverage
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="text-xs text-gray-400 mt-1">
                                {new Date(
                                  message.timestamp
                                ).toLocaleTimeString()}
                                {message.references?.length > 0 && (
                                  <span className="ml-2 text-green-300">
                                    ✓ PubMed sources attached
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      {isLoading && (
                        <div className="my-2 flex max-w-3xl items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-4 text-slate-300" role="status">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                          Preparing a response…
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  <div className="sticky bottom-0 border-t border-slate-800 bg-slate-950/95 p-4 backdrop-blur">
                    <form
                      onSubmit={handleSubmit}
                      className="mx-auto flex max-w-4xl items-end gap-3"
                    >
                      <div className="flex-1">
                        <label htmlFor="chat-prompt" className="sr-only">Message MedAssist</label>
                        <textarea
                        id="chat-prompt"
                        rows={2}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                        placeholder="Ask a health or general question…"
                        maxLength={4000}
                        className="max-h-40 min-h-12 w-full resize-y rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                        disabled={isLoading || loadingStates.saving}
                      />
                        <p className="mt-1 text-right text-[10px] text-slate-600">{prompt.length}/4,000</p>
                      </div>
                      <button
                        type="submit"
                        className="mb-4 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isLoading || loadingStates.saving || !prompt.trim()}
                      >
                        {loadingStates.saving ? "Saving..." : "Send"}
                      </button>
                    </form>
                    <p className="mx-auto mt-2 max-w-4xl text-center text-[11px] text-gray-500">
                      AI responses can be incomplete. Use cited sources and consult a qualified professional for medical decisions.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={user ? <AnalyticsDashboard /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={user ? "/chat" : "/"} replace />} />
      </Routes>
      <Footer />
    </Router>
  );
};

export default App;
