import React, {
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
import VerifyEmail from "./components/VerifyEmail";
import ReactMarkdown from "react-markdown";
import SubscriptionPage from "./components/subscription/SubscriptionPage";
import ApiKeysPage from "./components/apikeys/ApiKeysPage";
import AnalyticsDashboard from "./components/analytics/AnalyticsDashboard";
import AdminDashboard from "./components/admin/AdminDashboard";
import SettingsPage from "./components/settings/SettingsPage";

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
  const [fallbackToGemini, setFallbackToGemini] = useState(false);
  const messagesEndRef = useRef(null);
  const { sidebarOpen, setSidebarOpen } = useContext(SidebarContext);
  const { user } = useContext(AuthContext);
  const maxMessagesPerSession = 1000;
  const isInitialMount = useRef(true);
  const [wsReconnectAttempts, setWsReconnectAttempts] = useState(0);
  const wsRef = useRef(null);

  const debouncedUpdateSessions = useRef(
    debounce((newSessions) => {
      setChatSessions(newSessions);
    }, 300)
  ).current;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const processMessages = (chatMessages) => {
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
          });
        }
        if (msg.text) {
          processed.push({
            text: msg.text,
            isUser: msg.isUser || false,
            timestamp: msg.timestamp || new Date().toISOString(),
            isMedical: msg.isMedical || false,
            references: msg.references || [],
          });
        }
      });
    }
    return processed;
  };

  const fetchChatHistory = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/history", {
        credentials: "include",
      });
      const data = await response.json();
      console.log("Raw chat history data:", data);

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
            console.log("Processed messages for chat:", chatId, messages);

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

        console.log("Processed chat history:", history);
        setChatSessions(history);
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      setChatSessions([]);
    }
  };

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setChatSessions([]);
      return;
    }

    fetchChatHistory();

    const setupWebSocket = () => {
      const ws = new WebSocket(`ws://localhost:5000/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setConnectionError(false);
        setWsReconnectAttempts(0);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("WebSocket message received:", message);

          if (message.type === "CHAT_UPDATE") {
            if (message.data.action === "SAVE") {
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

        const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000);
        setTimeout(() => {
          setWsReconnectAttempts((prev) => prev + 1);
          setupWebSocket();
        }, delay);
      };
    };

    setupWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      debouncedUpdateSessions.cancel();
    };
  }, [user, activeSessionId, debouncedUpdateSessions]);

  const API_URL =
    "https://api-inference.huggingface.co/models/Ganesh19128734/fine-tuned-gpt2";
  const HF_API_KEY = import.meta.env.VITE_API_KEY;

  async function queryModel(prompt) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      console.error("Error:", response.statusText);
      return;
    }

    const result = await response.json();
    console.log(" Response:", result[0]?.generated_text);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!prompt.trim()) return;

    if (messages.length >= maxMessagesPerSession * 2) {
      alert("Chat limit reached. Please start a new chat.");
      return;
    }

    const userMessage = {
      text: prompt,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setPrompt("");
    setIsLoading(true);
    setFallbackToGemini(false);

    try {
      let botReply;
      let references = [];
      const isMedical = isMedicalQuery(prompt);

      if (isMedical) {
        try {
          const medicalResponse = await fetch(
            "http://localhost:5000/api/medical",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              },
              body: JSON.stringify({
                prompt,
                sessionId: activeSessionId || null,
              }),
              credentials: "include",
            }
          );

          const medicalData = await medicalResponse.json();

          if (!medicalResponse.ok) {
            if (medicalData.shouldFallback) {
              console.log("Medical API suggested fallback:", medicalData.error);
              setFallbackToGemini(true);
            } else {
              throw new Error(
                medicalData.error ||
                  `Medical API responded with ${medicalResponse.status}`
              );
            }
          } else if (medicalData.error) {
            throw new Error(medicalData.error);
          } else {
            botReply = medicalData.text;
            references = medicalData.references || [];
          }
        } catch (medicalError) {
          console.warn("Medical API failed:", medicalError.message);
          setFallbackToGemini(true);
        }
      }

      if (!isMedical || fallbackToGemini || !botReply) {
        const apiKey = import.meta.env.VITE_API_KEY;
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        botReply =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "I couldn't generate a response. Please try again.";
        botReply = formatGeminiResponse(botReply);
      }

      const botMessage = {
        text: botReply,
        isUser: false,
        timestamp: new Date().toISOString(),
        isMedical: isMedical && !fallbackToGemini,
        references,
      };

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);

      setLoadingStates((prev) => ({ ...prev, saving: true }));
      const saveResponse = await fetch("http://localhost:5000/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage.text,
          response: botReply,
          sessionId: activeSessionId || null,
          isMedical: isMedical && !fallbackToGemini,
          references,
        }),
        credentials: "include",
      });

      const saveData = await saveResponse.json();
      if (saveData.isNew) {
        setActiveSessionId(saveData.sessionId);
        setIsNewChat(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setError({
        message: "Failed to send message",
        details: error.message,
        retry: () => handleSubmit(e),
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
      const response = await fetch(`http://localhost:5000/api/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sessionId: actualSessionId,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.message || `Server responded with ${response.status}`
        );
      }

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
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verification-pending" element={<VerificationPending />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/subscription"
          element={user ? <SubscriptionPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/api-keys"
          element={user ? <ApiKeysPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/analytics"
          element={user ? <AnalyticsDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={user ? <AdminDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={user ? <SettingsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
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
                          <button
                            onClick={error.retry}
                            className="px-2 py-1 bg-red-700 rounded hover:bg-red-600"
                          >
                            Retry
                          </button>
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
                        <div className="text-center text-gray-400 py-10">
                          Start a new conversation
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
                                {message.isMedical && (
                                  <span className="ml-2 text-green-300">
                                    ✓ Verified Medical Source
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
                        placeholder="Type your message..."
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
                  </div>
                </div>
              </div>
            ) : (
              <Home />
            )
          }
        />
      </Routes>
      <Footer />
    </Router>
  );
};

export default App;
