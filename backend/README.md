# MedAssist AI - Backend Architecture & Documentation

Welcome to the backend service documentation for **MedAssist AI**, developed by **J Ganesh kumar reddy**.

The backend is built with **Node.js**, **Express**, **ws (WebSocket)**, and **MongoDB (Mongoose)**. It provides authenticated REST APIs, live WebSocket event synchronization, real-time medical literature grounding via the NCBI PubMed API, AI generation via Google Gemini, deterministic citation verification, and operational analytics.

---

## 1. System Architecture Overview

```
                                  +------------------------------------+
                                  |     React Client (Port 5173)       |
                                  +------------------------------------+
                                     | HTTP REST           | WebSocket
                                     v                     v
+-------------------------------------------------------------------------------+
|                       Express + WebSocket Server (server.js)                  |
|                                (Port 5000)                                    |
|                                                                               |
|  +--------------------+   +-------------------+   +------------------------+  |
|  | Global Middleware  |   | Rate Limiting     |   | WebSocket Server (/ws) |  |
|  | - Request ID (UUID)|   | - aiLimiter: 20/m |   | - JWT Cookie Auth      |  |
|  | - Security Headers |   | - authLimiter:30/ |   | - 30s Heartbeat Ping   |  |
|  | - CORS Whitelist   |   |   15m             |   | - User-Scoped Broadcast|  |
|  | - Body Limit (32kb)|   +-------------------+   +------------------------+  |
|  +--------------------+                                                       |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  |                             API Routes                                  |  |
|  |  /api/auth       /api/chat       /api/medical   /api/ai    /api/analytics|  |
|  +-------------------------------------------------------------------------+  |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  |                             Services                                    |  |
|  |  aiService.js       citationService.js       safetyService.js           |  |
|  |  emailService.js    historySearch.js                                    |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
           |                        |                           |
           v                        v                           v
  +------------------+     +-------------------+       +-----------------+
  | MongoDB Database |     | NCBI PubMed API   |       | Google Gemini   |
  | (Users, Chats)   |     | (esearch, esummary|       | (Generate API)  |
  +------------------+     +-------------------+       +-----------------+
```

---

## 2. Backend Module Mindmap Flow

```
[MedAssist Backend]
  │
  ├── server.js (HTTP + WebSocket Gateway)
  │     ├── Express app binding
  │     ├── WebSocket Server (/ws)
  │     │     ├── Handshake: Origin Check + JWT verification
  │     │     ├── Watchdog: 30s heartbeat ping-pong
  │     │     └── Broadcast: user-scoped CHAT_UPDATE event emission
  │     └── Graceful shutdown on SIGTERM / SIGINT
  │
  ├── app.js (Express Middleware Pipeline)
  │     ├── Request ID tracing (UUID v4)
  │     ├── Security headers (nosniff, no-referrer, permissions-policy)
  │     ├── CORS whitelist validation
  │     ├── Payload limits (JSON max 32kb)
  │     ├── Database connection (MongoDB via Mongoose)
  │     ├── Rate limiters (aiLimiter & authLimiter)
  │     ├── Route registration
  │     └── Centralized error boundary
  │
  ├── Routing Layer (routes/)
  │     ├── authRoute.js      ──► Register, Login, Refresh, Password Reset, Email Verification
  │     ├── chatRoute.js      ──► Save Chat, Get History, Update Title, Delete Session
  │     ├── medicalRoute.js   ──► Evidence-grounded PubMed query handler
  │     ├── aiRoute.js        ──► General AI chat with context retrieval
  │     └── analyticsRoute.js ──► Operational & dataset analytics overview
  │
  ├── Controller Layer (controllers/)
  │     ├── authController.js      ──► Dual-token issuance, bcrypt hashing, Brevo email triggers
  │     ├── chatController.js      ──► CRUD persistence, length limits, WebSocket sync
  │     ├── medicalController.js   ──► PubMed retrieval, context builder, citation audit
  │     ├── aiController.js        ──► Prompt screening, history retrieval, Gemini dispatch
  │     └── analyticsController.js ──► Multi-day trend metrics, dataset report parsing
  │
  ├── Service Layer (services/)
  │     ├── aiService.js       ──► Gemini API integration with history windowing
  │     ├── citationService.js ──► [1]..[N] grounding & hallucination evaluation
  │     ├── safetyService.js   ──► Screening for self-harm, harmful acts, emergencies
  │     ├── historySearch.js   ──► Token-overlap similarity for historical context
  │     └── emailService.js    ──► Transactional emails via Brevo SDK
  │
  ├── Middleware Layer (middleware/)
  │     └── authToken.js       ──► JWT accessToken cookie verification
  │
  └── Database Models (models/)
        ├── userModel.js ──► User credentials, bcrypt pre-save hook, tokens
        └── chatModel.js ──► Chat sessions, messages, PubMed references, verification
```

---

## 3. Core ASCII Flows

### Flow A: User Authentication & JWT Session Lifecycle

```
Client Browser                         authController                     MongoDB / Email
      │                                      │                                  │
  [1] │─── POST /api/auth/register ─────────>│                                  │
      │    { email, password }               ├─ Hash password (bcrypt) ─────────┤
      │                                      ├─ Generate 24h verify token       │
      │                                      ├─ Save User (isVerified: false) ──┤
      │                                      ├─ Send Email via Brevo API ───────┤
      │<── 201 Created ("Check email") ──────┤                                  │
      │                                      │                                  │
  [2] │─── GET /api/auth/verify-email?token ─>│                                  │
      │                                      ├─ Verify token & expiry ──────────┤
      │                                      ├─ Update isVerified: true ────────┤
      │<── 200 OK ("Email verified") ────────┤                                  │
      │                                      │                                  │
  [3] │─── POST /api/auth/login ─────────────>│                                  │
      │    { email, password }               ├─ Compare password (bcrypt) ──────┤
      │                                      ├─ Check isVerified === true       │
      │                                      ├─ Issue accessToken (15m, cookie) │
      │                                      ├─ Issue refreshToken (7d, cookie) ┤
      │<── 200 OK (Set-Cookie: tokens) ──────┤                                  │
      │                                      │                                  │
  [4] │─── POST /api/auth/refresh-token ────>│                                  │
      │    Cookie: refreshToken              ├─ Verify refreshToken ────────────┤
      │<── 200 OK (Set-Cookie: new access) ──┤                                  │
```

---

### Flow B: Grounded Medical Response & Citation Audit Flow

```
Client Browser           medicalController              NCBI PubMed API         Gemini API
      │                          │                             │                    │
  [1] │─── POST /api/medical ───>│                             │                    │
      │    { prompt }            ├─ safetyService.screen()     │                    │
      │                          │                             │                    │
  [2] │                          ├─ esearch.fcgi?term=prompt ─>│                    │
      │                          │<─ { idlist: [pmid1, pmid2] }┤                    │
      │                          │                             │                    │
  [3] │                          ├─ esummary.fcgi?id=pmids ───>│                    │
      │                          │<─ { articles metadata } ────┤                    │
      │                          │                                                  │
  [4] │                          ├─ Build Source Context:                           │
      │                          │  "[1] Title... PMID..."                          │
      │                          │                                                  │
  [5] │                          ├─ generateWithGemini() ──────────────────────────>│
      │                          │  - Bounded prompt with strict citation rules     │
      │                          │<─ "According to [1], migraine causes... [2]" ────┤
      │                          │                                                  │
  [6] │                          ├─ assessCitationGrounding(response, 2)            │
      │                          │  - Valid: [1, 2]                                 │
      │                          │  - Invalid: []                                   │
      │                          │  - Status: "citation_checked", Grounded: true    │
      │                          │                                                  │
  [7] │<── 200 OK Response ──────┤                                                  │
      │    - text with [1], [2]  │                                                  │
      │    - references metadata │                                                  │
      │    - verification audit  │                                                  │
```

---

### Flow C: Real-Time WebSocket Synchronization

```
Client Browser                   server.js (WSS)                 chatController
      │                                 │                               │
  [1] │─── WS Handshake (/ws) ─────────>│                               │
      │    Cookie: accessToken          ├─ Authenticate JWT             │
      │<── 101 Switching Protocols ─────┤  Store ws.userId = decoded.id │
      │                                 │                               │
  [2] │    [Periodic Heartbeat]         │                               │
      │<── ping() (every 30s) ──────────┤                               │
      │─── pong() ─────────────────────>│ (ws.isAlive = true)           │
      │                                 │                               │
  [3] │─── POST /api/save ─────────────────────────────────────────────>│
      │    { prompt, response, ... }    │                               ├─ Save to DB
      │                                 │<─ broadcastUpdate(data, uid) ─┤
      │                                 ├─ Filter clients by userId     │
      │<── ws.send(CHAT_UPDATE) ────────┤                               │
```

---

## 4. Environment Variables (`.env`)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | HTTP & WebSocket server port | `5000` |
| `NODE_ENV` | Runtime environment mode | `development` or `production` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/medassist` |
| `CLIENT_ORIGIN` | Allowed client origin(s) for CORS | `http://localhost:5173` |
| `JWT_ACCESS_TOKEN` | Secret key for 15-minute access token | `random-32-char-string` |
| `JWT_REFRESH_TOKEN` | Secret key for 7-day refresh token | `random-32-char-string` |
| `JWT_VERIFICATION_TOKEN` | Secret key for 24-hour email verify token | `random-32-char-string` |
| `JWT_RESET_TOKEN` | Secret key for 1-hour password reset token | `random-32-char-string` |
| `GEMINI_API_KEY` | Google AI Studio API key | `AIzaSy...` |
| `GEMINI_MODEL` | Target Gemini model identifier | `gemini-3.8-flash` |
| `BREVO_API_KEY` | Brevo (Sendinblue) transactional email key | `xkeysib-...` |
| `EMAIL_FROM_ADDRESS` | Sender email address | `no-reply@medassist.ai` |
| `EMAIL_FROM_NAME` | Sender display name | `MedAssist AI` |

---

## 5. API Reference

### Authentication Endpoints (`/api/auth`)
- `POST /register`: Register user with email and password (min 8 chars).
- `POST /login`: Authenticate and issue HTTP-only cookies.
- `GET /check`: Validate current access token cookie.
- `POST /logout`: Invalidate refresh token and clear cookies.
- `POST /refresh-token`: Exchange valid refresh cookie for new access token.
- `GET /verify-email`: Verify email address via query parameter token.
- `POST /resend-verification`: Dispatch fresh verification email.
- `POST /forgot-password`: Request password reset email.
- `POST /reset-password`: Set new password using reset token.

### Chat & History Endpoints (`/api`)
- `POST /save`: Save a prompt/response exchange to a new or existing session.
- `GET /history`: Fetch user's chat sessions (supports `?q=search` and `?limit=100`).
- `PATCH /chats/:sessionId`: Rename session title (1 to 80 characters).
- `DELETE /chats/:sessionId`: Delete user-owned chat session.
- `DELETE /delete`: Legacy delete endpoint accepting sessionId in body.

### AI & Medical Endpoints
- `POST /api/medical`: Query PubMed and generate bounded medical answer.
- `POST /api/ai/chat`: Query Gemini for general health assistance with context.
- `GET /api/health`: Health status, DB state, uptime, and AI configuration status.
- `GET /api/analytics/overview`: Usage metrics across 7, 30, or 90 days.

---

## 6. Running Tests

The backend uses Node.js native test runner:

```bash
npm test
```

All 9 unit tests cover citation grounding validation, history relevance scoring, and safety filter boundaries.
