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
import { debounce } from "lodash";
import { isMedicalQuery } from "./utils/medicalDetector";
import VerificationPending from "./components/auth/VerificationPending";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import VerifyEmail from "./components/auth/VerifyEmail";
import ReactMarkdown from "react-markdown";
import AnalyticsDashboard from "./components/dashboard/AnalyticsDashboard";
import { apiRequest, getWebSocketUrl } from "./lib/api";

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
  const { user } = useContext(AuthContext);
  const maxMessagesPerSession = 1000;
  const wsReconnectAttempts = useRef(0);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const debouncedUpdateSessions = useRef(
    debounce((newSessions) => {
      setChatSessions(newSessions);
    }, 300)
  ).current;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const fetchChatHistory = useCallback(async () => {
    try {
      const data = await apiRequest("/history");

      if (Array.isArray(data)) {
        const history = data
          .map((chat) => {
            if (!chat || typeof chat !== "object") {
              console.warn("Invalid chat object:", chat);
              return null;
            }

            const chatId = chat.sessionId || chat._id || chat.id;
            if (!chatId) {
              console.warn("Chat missing ID:", chat);
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
        console.log("WebSocket connected");
        setConnectionError(false);
        wsReconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("WebSocket message received:", message);

          if (message.type === "CHAT_UPDATE") {
            if (["SAVE", "NEW", "UPDATE"].includes(message.data.action)) {
              if (message.data.chat.id !== activeSessionId) {
                debouncedUpdateSessions((prev) => {
                  const chat = message.data.chat;
                  const chatId = chat.sessionId || chat._id || chat.id;

                  if (!chatId) {
                    console.warn("Chat missing ID:", chat);
                    return prev;
                  }

                  const messages = processMessages(chat.messages);
                  if (messages.length === 0) {
                    console.warn("No valid messages in chat:", chat);
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

                  console.log("Processed WebSocket chat:", processedChat);

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
              console.log("Deleting session:", sessionIdToDelete);

              if (!sessionIdToDelete) {
                console.warn("No session ID provided for deletion");
                return;
              }

              debouncedUpdateSessions((prev) =>
                prev.filter(
                  (c) =>
                    c.id !== sessionIdToDelete &&
                    c.sessionId !== sessionIdToDelete
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
        console.log("WebSocket disconnected");
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
      debouncedUpdateSessions.cancel();
    };
  }, [user, activeSessionId, debouncedUpdateSessions, fetchChatHistory, processMessages]);

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
        setIsNewChat(false);
      }
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

  const handleDeleteChat = async (sessionId) => {
    if (!sessionId) {
      console.error("No sessionId provided for deletion");
      setError({
        message: "Failed to delete chat",
        details: "No session ID provided",
      });
      return;
    }

    console.log("Attempting to delete session:", sessionId);

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
    console.log("Found session to delete:", sessionToDelete);

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

      console.log("Successfully deleted chat with ID:", actualSessionId);
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

  const handleNewChat = () => {
    setMessages([]);
    setActiveSessionId(null);
    setIsNewChat(true);
  };

  const handleLoadChat = (session) => {
    console.log("Loading chat session:", session);

    if (!session || !session.messages) {
      console.error("Invalid session data:", session);
      setError({
        message: "Failed to load chat",
        details: "Invalid chat session data",
      });
      return;
    }

    const sessionId = session.sessionId || session.id;
    console.log("Setting active session ID:", sessionId);

    const messages = processMessages(session.messages);
    console.log("Formatted messages:", messages);

    setActiveSessionId(sessionId);
    setMessages(messages);
    setIsNewChat(false);
  };

  const groupedSessions = groupChatSessionsByDate(chatSessions);

  return (
    <Router>
      <Header />
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/chat" replace /> : <Home />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
                  loadingStates={loadingStates}
                  deletingSessionIds={deletingSessionIds}
                  activeSessionId={activeSessionId}
                  isNewChat={isNewChat && messages.length === 0}
                />

                <div className="flex-1 flex flex-col">
                  <header className="sticky top-0 z-10 flex items-center justify-center text-xl font-bold py-4 bg-gray-800 shadow-md">
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="absolute left-4 text-white focus:outline-none"
                    >
                      ☰
                    </button>
                    Chat App
                    {connectionError && (
                      <span className="text-xs text-yellow-400 ml-2">
                        (Connection issues)
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

                  <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto p-4">
                      {messages.length === 0 && !isLoading ? (
                        <div className="mx-auto max-w-2xl py-16 text-center">
                          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-400/10 text-2xl text-cyan-300">
                            +
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
                              className={`inline-block p-3 rounded-lg max-w-3xl transition duration-300 shadow-md ${
                                message.isUser
                                  ? "bg-blue-600 text-white"
                                  : message.isMedical
                                    ? "bg-green-800 text-gray-200"
                                    : "bg-gray-700 text-gray-200"
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
                        <div className="p-3 my-2 rounded-lg max-w-3xl bg-gray-700 text-gray-200">
                          Typing...
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  <div className="sticky bottom-0 bg-gray-800 p-4 border-t border-gray-700">
                    <form
                      onSubmit={handleSubmit}
                      className="flex gap-3 max-w-4xl mx-auto"
                    >
                      <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask a health or general question…"
                        maxLength={4000}
                        className="flex-1 p-2 bg-gray-700 text-white rounded-md outline-none focus:ring focus:ring-blue-500"
                        disabled={isLoading || loadingStates.saving}
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition disabled:opacity-50"
                        disabled={isLoading || loadingStates.saving}
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
