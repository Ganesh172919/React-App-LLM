/**
 * ============================================================================
 * MEDASSIST AI - CHAT & MESSAGE MONGOOSE MODEL (chatModel.js)
 * ============================================================================
 * Role:
 *   Defines the hierarchical database schema for chat sessions, conversation
 *   exchanges, medical source citations, and verification metadata.
 *
 * Schema Structure:
 *   - Reference Sub-schema: Stores structured PubMed bibliography records
 *     (title, authors array, journal, publication date, pmid, pubmed URL).
 *   - Verification Sub-schema: Stores audit outcomes for hallucinations & citations
 *     (status, provider, model, sourceCount, validCitationCount, invalidCitationCount,
 *     citationCoverage percentage, historyMessagesUsed, safetyCategory).
 *   - Message Sub-schema: Represents one prompt-response exchange, flag `isMedical`,
 *     attached references, and verification audit.
 *   - Chat Schema: Top-level session container keyed by unique `sessionId`, owned
 *     by `userId`, with automated timestamp updates and aggregated `isMedical` status.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: CHAT MODEL COMPOSITION & PRE-SAVE AUTOMATION
 * ----------------------------------------------------------------------------
 * [Chat Schema Hierarchy]
 *   │
 *   ├── 1. Chat Container (Top Level)
 *   │     ├── sessionId: { String, unique: true, index: true }
 *   │     ├── userId: { ObjectId, ref: 'User', required: true, index: true }
 *   │     ├── title: { String, default: 'New Chat' }
 *   │     ├── isMedical: { Boolean, default: false, index: true }
 *   │     ├── createdAt: { Date, default: Date.now, index: true }
 *   │     ├── updatedAt: { Date, default: Date.now, index: true }
 *   │     └── messages: [messageSchema]
 *   │
 *   ├── 2. messageSchema (Exchanges)
 *   │     ├── prompt: String (User input)
 *   │     ├── response: String (Bot output)
 *   │     ├── isMedical: Boolean
 *   │     ├── timestamp: Date
 *   │     ├── references: [referenceSchema]
 *   │     └── verification: verificationSchema
 *   │
 *   ├── 3. referenceSchema (PubMed Grounding)
 *   │     └── { title, authors[], journal, pubdate, pmid, url }
 *   │
 *   ├── 4. verificationSchema (Grounding Quality Audit)
 *   │     └── { status, provider, model, sourceCount, grounded,
 *   │           validCitationCount, invalidCitationCount,
 *   │           citationCoverage, historyMessagesUsed, safetyCategory }
 *   │
 *   └── 5. Pre-Save Lifecycle Hook
 *         ├── Automatically refreshes this.updatedAt = Date.now()
 *         └── Dynamically evaluates this.isMedical = messages.some(m => m.isMedical)
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: MESSAGE ACCUMULATION & SAVE LIFECYCLE
 * ----------------------------------------------------------------------------
 *  [Incoming User Chat Exchange]
 *                 │
 *                 ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ Construct Message Entity                               │
 *  │ - prompt: "What are symptoms of migraine?"             │
 *  │ - response: "Migraines cause throbbing pain [1]..."    │
 *  │ - references: [{ pmid: "12345", title: "..." }]        │
 *  │ - verification: { status: "citation_checked", ... }    │
 *  └────────────────────────────────────────────────────────┘
 *                 │
 *                 ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ Push to chat.messages Array                            │
 *  └────────────────────────────────────────────────────────┘
 *                 │
 *                 ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ Execute chat.save() -> Pre-Save Hook                   │
 *  │ 1. this.updatedAt = Date.now()                         │
 *  │ 2. this.isMedical = any message.isMedical === true     │
 *  └────────────────────────────────────────────────────────┘
 *                 │
 *                 ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ Persisted in MongoDB "chats" Collection                │
 *  └────────────────────────────────────────────────────────┘
 * ============================================================================
 */
const mongoose = require("mongoose");

const referenceSchema = new mongoose.Schema(
  {
    title: String,
    authors: [String],
    journal: String,
    pubdate: String,
    pmid: String,
    url: String,
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    status: String,
    provider: String,
    model: String,
    sourceCount: Number,
    grounded: Boolean,
    validCitationCount: Number,
    invalidCitationCount: Number,
    citationCoverage: Number,
    historyMessagesUsed: Number,
    safetyCategory: String,
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      required: true,
    },
    isMedical: {
      type: Boolean,
      default: false,
    },
    references: [referenceSchema],
    verification: verificationSchema,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  messages: [messageSchema],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: "New Chat",
  },
  isMedical: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

chatSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  if (this.isModified("messages")) {
    this.isMedical = this.messages.some((msg) => msg.isMedical);
  }

  next();
});

module.exports = mongoose.model("Chat", chatSchema);
