/**
 * ============================================================================
 * MEDASSIST AI - CHAT CONTROLLER (chatController.js)
 * ============================================================================
 * Role:
 *   Manages the persistent lifecycle of user chat sessions and conversation
 *   exchanges. Implements creation, retrieval with case-insensitive search,
 *   session renaming, confirmed session deletion, and real-time WebSocket event
 *   broadcasting scoped strictly to the authenticated user.
 *
 * Operational Constraints:
 *   - MAX_EXCHANGES_PER_SESSION: 1,000 prompt-response pairs per conversation.
 *   - MAX_RESPONSE_LENGTH: 20,000 characters per AI response.
 *   - Input Prompt Length: 4,000 characters maximum.
 *   - Real-time Sync: Emits "NEW", "UPDATE", "RENAME", and "DELETE" WebSocket
 *     actions through `app.locals.broadcastUpdate(data, userId)`.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: CHAT PERSISTENCE & CRUD OPERATIONS
 * ----------------------------------------------------------------------------
 * [chatController.js]
 *   │
 *   ├── 1. Save Conversation Exchange (saveChat)
 *   │     ├── Validates prompt & response presence and character limits
 *   │     ├── If existing sessionId:
 *   │     │     ├── Locates session owned by req.user.id
 *   │     │     ├── Enforces <= 1000 exchanges limit (returns 409 if full)
 *   │     │     └── Appends new message with references & verification
 *   │     ├── If new session:
 *   │     │     ├── Generates fresh UUID v4 sessionId
 *   │     │     └── Initializes Chat document with prompt slice as title
 *   │     ├── Triggers WebSocket broadcast: action "NEW" or "UPDATE"
 *   │     └── Returns 201 Created with sessionId and isNew flag
 *   │
 *   ├── 2. Retrieve Chat History (getHistory)
 *   │     ├── Supports optional query parameter `q` (title or message search)
 *   │     ├── Applies regex search escaping to protect MongoDB against ReDoS
 *   │     ├── Sorts sessions descending by updatedAt (limit: 1 to 200, default 100)
 *   │     └── Maps Mongoose document structure into client message format
 *   │
 *   ├── 3. Rename Conversation (updateChat)
 *   │     ├── Validates title length (1 to 80 characters)
 *   │     ├── Updates chat document where sessionId & userId match
 *   │     ├── Triggers WebSocket broadcast: action "RENAME"
 *   │     └── Returns 200 OK with updated sessionId and title
 *   │
 *   └── 4. Delete Conversation (deleteChat)
 *         ├── Resolves sessionId from URL params or request body
 *         ├── Validates session ownership by req.user.id
 *         ├── Deletes Chat document from MongoDB
 *         ├── Triggers WebSocket broadcast: action "DELETE"
 *         └── Returns 200 OK with success confirmation
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: CONVERSATION SAVE & REAL-TIME WEBSOCKET SYNC
 * ----------------------------------------------------------------------------
 *  Client Browser               chatController                   MongoDB           WebSocket Clients
 *        │                            │                             │                      │
 *    [1] │─── POST /api/save ────────>│                             │                      │
 *        │    { prompt, response,     ├─ Validate limits            │                      │
 *        │      sessionId, refs, ... }├─ Find/Create Chat ──────────┤                      │
 *        │                            ├─ Append message & save() ───┤                      │
 *        │                            ├─ broadcastUpdate(chat, uid) ──────────────────────>│
 *        │                            │                             │   (Filter: ws.userId │
 *        │<── 201 { sessionId, isNew }┤                             │    == req.user.id)   │
 *        │                            │                             │<── CHAT_UPDATE ──────┘
 * ============================================================================
 */
const Chat = require("../models/chatModel");
const { v4: uuidv4 } = require("uuid");

const MAX_EXCHANGES_PER_SESSION = 1000;
const MAX_RESPONSE_LENGTH = 20000;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * ----------------------------------------------------------------------------
 * METHOD: saveChat
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW:
 * [saveChat Execution]
 *   ├── Input Validation: prompt (1..4000 chars), response (1..20000 chars)
 *   ├── Session Branching:
 *   │     ├── If sessionId provided: Find existing chat by (sessionId, req.user.id)
 *   │     │     ├── Check limit: messages.length >= 1000 ──► Return 409 Conflict
 *   │     │     ├── Exists: Append exchange, update updatedAt and isMedical flag
 *   │     │     └── Not found: Create new session with UUID v4
 *   │     └── No sessionId: Create new session with UUID v4
 *   ├── Broadcast Update:
 *   │     └── app.locals.broadcastUpdate({ action: "UPDATE"|"NEW", chat, ... }, req.user.id)
 *   └── Return: 201 Created { sessionId, isNew }
 *
 * ASCII FLOW:
 * [POST /api/save] ──► Validate Length ──► (Existing Session?)
 *                                                │
 *                       ┌────────────────────────┴────────────────────────┐
 *                       ▼                                                 ▼
 *                     [Yes]                                              [No]
 *                       │                                                 │
 *              (Exchanges >= 1000?)                               Create New Chat
 *               ├──► [Yes] ──► 409 Conflict                               │
 *               └──► [No]  ──► Append & Save                              │
 *                               │                                         │
 *                               └──────────────────┬──────────────────────┘
 *                                                  │
 *                                                  ▼
 *                                       broadcastUpdate(User) ──► 201 Response
 * ----------------------------------------------------------------------------
 */
exports.saveChat = async (req, res) => {
  try {
    const { sessionId, isMedical = false, references = [], verification } = req.body;
    const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : "";
    const response = typeof req.body.response === "string" ? req.body.response.trim() : "";
    if (!prompt || !response) {
      return res
        .status(400)
        .json({ message: "Prompt and response are required" });
    }
    if (prompt.length > 4000 || response.length > MAX_RESPONSE_LENGTH) {
      return res.status(400).json({ message: "Message exceeds the supported length" });
    }

    let chat;
    if (sessionId) {
      chat = await Chat.findOne({ sessionId, userId: req.user.id });
      if (chat && chat.messages.length >= MAX_EXCHANGES_PER_SESSION) {
        return res.status(409).json({ message: "Chat limit reached; start a new chat" });
      }
      if (chat) {
        chat.messages.push({ prompt, response, isMedical, references, verification });
        chat.updatedAt = Date.now();
        chat.isMedical = chat.isMedical || Boolean(isMedical);
        await chat.save();
      } else {
        const newSessionId = uuidv4();
        chat = new Chat({
          sessionId: newSessionId,
          userId: req.user.id,
          title: prompt.slice(0, 60) || "New Chat",
          messages: [{ prompt, response, isMedical, references, verification }],
          isMedical,
        });
        await chat.save();
      }
    } else {
      const newSessionId = uuidv4();
      chat = new Chat({
        sessionId: newSessionId,
        userId: req.user.id,
        title: prompt.slice(0, 60) || "New Chat",
        messages: [{ prompt, response, isMedical, references, verification }],
        isMedical,
      });
      await chat.save();
    }

    if (req.app.locals.broadcastUpdate) {
      req.app.locals.broadcastUpdate({
        action: chat.sessionId === sessionId ? "UPDATE" : "NEW",
        chat: {
          id: chat.sessionId,
          sessionId: chat.sessionId,
          title: chat.title,
          isMedical: chat.isMedical,
          messages: chat.messages.flatMap((msg) => [
            {
              text: msg.prompt,
              isUser: true,
              timestamp: msg.timestamp,
              isMedical: msg.isMedical,
            },
            {
              text: msg.response,
              isUser: false,
              timestamp: msg.timestamp,
              isMedical: msg.isMedical,
              references: msg.references,
              verification: msg.verification,
            },
          ]),
          timestamp: chat.updatedAt,
        },
        sessionId: chat.sessionId,
        userId: chat.userId.toString(),
      }, req.user.id);
    }

    res.status(201).json({
      message: "Chat saved successfully",
      sessionId: chat.sessionId,
      isNew: chat.sessionId !== sessionId,
    });
  } catch (error) {
    console.error("Error saving chat:", error);
    res
      .status(500)
      .json({ message: "Error saving chat" });
  }
};

/**
 * ----------------------------------------------------------------------------
 * METHOD: getHistory
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW:
 * [getHistory Execution]
 *   ├── Query Parameters:
 *   │     ├── limit: clamped between 1 and 200 (default: 100)
 *   │     └── q: optional text search query (max 80 chars)
 *   ├── MongoDB Filter Construction:
 *   │     ├── Base: { userId: req.user.id }
 *   │     └── With Search: escapeRegex(q) ──► $or: [{ title }, { "messages.prompt" }]
 *   ├── Query Execution: Chat.find(filter).sort({ updatedAt: -1 }).limit(limit).lean()
 *   ├── Data Mapping: Formats into client message array with text, isUser, references, verification
 *   └── Return: 200 OK formattedChats[]
 *
 * ASCII FLOW:
 * [GET /api/history?q=search] ──► Parse limit & query
 *                                         │
 *                                         ▼
 *                          Build ReDoS-Safe Regex Filter
 *                                         │
 *                                         ▼
 *                          Chat.find({ userId, $or }).sort(-1)
 *                                         │
 *                                         ▼
 *                          Map to Normalized Message Format ──► 200 OK JSON
 * ----------------------------------------------------------------------------
 */
exports.getHistory = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 200);
    const search = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
    const filter = { userId: req.user.id };
    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ title: expression }, { "messages.prompt": expression }];
    }
    const chats = await Chat.find(filter)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    const formattedChats = chats.map((chat) => ({
      id: chat.sessionId,
      title: chat.title || chat.messages[0]?.prompt?.slice(0, 60) || "New Chat",
      messages: chat.messages.flatMap((msg) => [
        {
          text: msg.prompt,
          isUser: true,
          timestamp: msg.timestamp,
          isMedical: msg.isMedical,
        },
        {
          text: msg.response,
          isUser: false,
          timestamp: msg.timestamp,
          isMedical: msg.isMedical,
          references: msg.references,
          verification: msg.verification,
        },
      ]),
      timestamp: chat.updatedAt,
      isMedical: chat.isMedical,
    }));

    res.status(200).json(formattedChats);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res
      .status(500)
      .json({ message: "Error fetching chat history" });
  }
};

/**
 * ----------------------------------------------------------------------------
 * METHOD: updateChat (Rename Session)
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW:
 * [updateChat Execution]
 *   ├── Input Validation: title must be string between 1 and 80 characters
 *   ├── Atomic Update: Chat.findOneAndUpdate({ sessionId, userId }, { $set: { title, updatedAt } })
 *   ├── Ownership Check: If chat not found -> return 404 Not Found
 *   ├── Real-Time Broadcast: broadcastUpdate({ action: "RENAME", sessionId, title }, req.user.id)
 *   └── Return: 200 OK { sessionId, title }
 *
 * ASCII FLOW:
 * [PATCH /api/chats/:id] ──► Validate Title (1..80) ──► findOneAndUpdate({ id, uid })
 *                                                               │
 *                                                      ┌────────┴────────┐
 *                                                      ▼                 ▼
 *                                                  [Found]          [Not Found]
 *                                                      │                 │
 *                                                      ▼                 ▼
 *                                              broadcastUpdate()      404 Error
 *                                              200 OK JSON
 * ----------------------------------------------------------------------------
 */
exports.updateChat = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title || title.length > 80) {
      return res.status(400).json({ message: "Title must be between 1 and 80 characters" });
    }
    const chat = await Chat.findOneAndUpdate(
      { sessionId, userId: req.user.id },
      { $set: { title, updatedAt: Date.now() } },
      { new: true }
    );
    if (!chat) return res.status(404).json({ message: "Chat session not found" });
    if (req.app.locals.broadcastUpdate) {
      req.app.locals.broadcastUpdate(
        { action: "RENAME", sessionId, title, userId: String(req.user.id) },
        req.user.id
      );
    }
    return res.status(200).json({ sessionId, title });
  } catch (error) {
    console.error("Update chat error:", error.message);
    return res.status(500).json({ message: "Failed to update chat session" });
  }
};

/**
 * ----------------------------------------------------------------------------
 * METHOD: deleteChat (Delete Session)
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW:
 * [deleteChat Execution]
 *   ├── Input Extraction: sessionId from req.params.sessionId or req.body.sessionId
 *   ├── Validation: If missing -> return 400 Bad Request
 *   ├── Ownership Lookup: Chat.findOne({ sessionId, userId: req.user.id })
 *   │     └── If not found -> return 404 Not Found
 *   ├── Deletion: Chat.deleteOne({ _id: chat._id })
 *   ├── Real-Time Broadcast: broadcastUpdate({ action: "DELETE", sessionId }, req.user.id)
 *   └── Return: 200 OK { success: true, message: "Chat session deleted successfully" }
 *
 * ASCII FLOW:
 * [DELETE /api/chats/:id] ──► Verify sessionId ──► Find User-Owned Session
 *                                                         │
 *                                                ┌────────┴────────┐
 *                                                ▼                 ▼
 *                                             [Found]         [Not Found]
 *                                                │                 │
 *                                                ▼                 ▼
 *                                        Chat.deleteOne()      404 Error
 *                                                │
 *                                                ▼
 *                                        broadcastUpdate()
 *                                        200 OK Response
 * ----------------------------------------------------------------------------
 */
exports.deleteChat = async (req, res) => {
  try {
    const sessionId = req.params.sessionId || req.body.sessionId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    const chat = await Chat.findOne({
      sessionId: sessionId,
      userId: req.user.id,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found or not owned by user",
      });
    }

    await Chat.deleteOne({ _id: chat._id });

    if (req.app.locals.broadcastUpdate) {
      req.app.locals.broadcastUpdate({
        action: "DELETE",
        sessionId: sessionId,
        userId: req.user.id.toString(),
      }, req.user.id);
    }

    res.status(200).json({
      success: true,
      message: "Chat session deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete chat session",
    });
  }
};
