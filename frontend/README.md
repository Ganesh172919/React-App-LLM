# MedAssist AI - Frontend Architecture & Documentation

Welcome to the frontend application documentation for **MedAssist AI**, developed by **J Ganesh kumar reddy**.

The frontend is a modern, responsive Single Page Application (SPA) built with **React 19**, **Vite 6**, **Tailwind CSS 4**, **React Router 7**, and **React Markdown**. It provides an interactive health conversation workspace, citation-aware markdown rendering, automated medical query routing, real-time WebSocket state synchronization, and an operations dashboard.

---

## 1. Frontend Architecture Overview

```
                                      +------------------------------------+
                                      |     index.html / main.jsx          |
                                      +------------------------------------+
                                                        |
                                                        v
                                      +------------------------------------+
                                      |            <StrictMode>            |
                                      +------------------------------------+
                                                        |
                                                        v
                                      +------------------------------------+
                                      |           <AuthProvider>           |
                                      |   (Manages User & Session Token)   |
                                      +------------------------------------+
                                                        |
                                                        v
                                      +------------------------------------+
                                      |          <SidebarProvider>         |
                                      |     (Drawer Visibility Context)    |
                                      +------------------------------------+
                                                        |
                                                        v
                                      +------------------------------------+
                                      |               <App />              |
                                      |     (Router, Chat Engine, WSS)     |
                                      +------------------------------------+
                                         /             |               \
                                        /              |                \
                                       v               v                 v
                       +---------------+    +-------------------+    +----------------------+
                       | Public Views  |    | Main Workspace    |    | Operations Dashboard |
                       | - <Home />    |    | - <Sidebar />     |    | - <AnalyticsDashboard|
                       | - <Login />   |    | - Chat Message Feed|   +----------------------+
                       | - <Register />|    | - Input Form      |
                       | - Auth Flow   |    +-------------------+
                       +---------------+
```

---

## 2. Frontend Component & Context Mindmap Flow

```
[MedAssist Frontend]
  │
  ├── Entrypoint (main.jsx)
  │     ├── StrictMode wrapper
  │     ├── AuthProvider context
  │     ├── SidebarProvider context
  │     └── App root mounting
  │
  ├── Context Layer (context/)
  │     ├── AuthContext.jsx       ──► user, setUser, checkAuth(), logout()
  │     └── SidebarContext.jsx    ──► sidebarOpen, setSidebarOpen()
  │
  ├── Library & Utilities (lib/ & utils/)
  │     ├── api.js                ──► apiRequest() fetch wrapper & getWebSocketUrl()
  │     └── medicalDetector.js    ──► isMedicalQuery() clinical heuristic classifier
  │
  ├── Main Application Router (App.jsx)
  │     ├── Routing configuration (React Router 7)
  │     ├── WebSocket sync (/ws) with exponential backoff
  │     ├── Prompt submission pipeline (dual-path routing)
  │     ├── Markdown rendering (ReactMarkdown + syntax blocks)
  │     ├── Verification status badges (Citations checked, etc.)
  │     └── Session lifecycle (New, Load, Rename, Export, Delete)
  │
  ├── Components (components/)
  │     ├── header/Header.jsx     ──► Logo branding, active nav links, auth controls
  │     ├── footer/Footer.jsx     ──► Dynamic copyright & attribution banner
  │     ├── home/Home.jsx         ──► Public landing page & grounded preview card
  │     ├── Sidebar.jsx           ──► Searchable conversation drawer with actions
  │     ├── Login.jsx             ──► User sign-in with verification alerts
  │     ├── Register.jsx          ──► Account creation form
  │     │
  │     ├── dashboard/AnalyticsDashboard.jsx
  │     │     ├── Key metrics cards (Sessions, Exchanges, Citations, Grounding)
  │     │     ├── Interactive SVG activity trend chart (7/30/90 days)
  │     │     ├── Verification outcomes breakdown bars
  │     │     ├── Dataset quality & multi-answer audit profile
  │     │     ├── Question type classification distribution
  │     │     ├── Answer length word-count distribution
  │     │     └── Telemetry JSON exporter
  │     │
  │     └── auth/
  │           ├── ForgotPassword.jsx     ──► Password reset email request
  │           ├── ResetPassword.jsx      ──► New password form via token
  │           ├── VerifyEmail.jsx        ──► Tokenized email confirmation
  │           └── VerificationPending.jsx──► 24-hour verification notice
```

---

## 3. Core ASCII Flows

### Flow A: Client-Side Dual-Path Query Dispatch

```
[User Types Prompt in Chat Input]
               │
               ▼
   isMedicalQuery(prompt)
               │
      ┌────────┴──────────────────────────┐
      ▼                                   ▼
    [True]                             [False]
(Clinical keyword/prefix)         (General / Non-clinical)
      │                                   │
      ▼                                   ▼
POST /api/medical                 POST /api/ai/chat
(PubMed E-Search & Summary)       (General Gemini Generation)
      │                                   │
      ├─ [On error] ──► Fallback to AI    │
      │                                   │
      └─────────────────┬─────────────────┘
                        │
                        ▼
           [Format Bot Response Text]
          - Bullet normalization
          - Warning/Note bolding
          - Markdown fenced code blocks
                        │
                        ▼
           [Append Message with References]
          - PubMed article titles & PMIDs
          - Verification badge & coverage %
                        │
                        ▼
           POST /api/save (Persist exchange)
```

---

### Flow B: Real-Time WebSocket Synchronization in Client

```
Client App.jsx                          Server (server.js)
      │                                         │
  [1] │─── Connect: new WebSocket(url) ────────>│
      │<── Connection Open (onopen) ────────────┤
      │                                         │
  [2] │    [Incoming Real-Time Update]          │
      │<── onmessage: { type: "CHAT_UPDATE" } ──┤
      │                                         │
      ├─ Case action === "NEW" | "UPDATE":      │
      │    Insert or update chat in sessions    │
      │                                         │
      ├─ Case action === "RENAME":              │
      │    Update title in chatSessions array   │
      │                                         │
      ├─ Case action === "DELETE":              │
      │    Filter out deleted sessionId         │
      │                                         │
  [3] │    [Unexpected Disconnection]           │
      │─── onclose event triggered              │
      │    - Set connectionError: true          │
      │    - Delay = min(1000 * 2^attempts, 30s)│
      │    - Reconnect loop invokes setupWS()   │
```

---

### Flow C: Analytics Dashboard Render & Filter Pipeline

```
User Selects Period (7, 30, or 90 Days)
                  │
                  ▼
   loadAnalytics(days) ──► GET /api/analytics/overview?days=N
                                  │
                                  ▼
   Receive Analytics Payload:
   - summary: { totalSessions, totalMessages, groundingRate, ... }
   - trend: [{ date, sessions, exchanges }, ...]
   - verification: { statuses, providers }
   - dataset: { rows, qualityFlags, audit, answerLengthDistribution, ... }
                  │
                  ▼
   Reactive useMemo Computations:
   - maxValue = max(all exchanges, sessions)
   - buildChart(): Map points to SVG coordinates (X: 18..282, Y: 112..26)
   - pathFromPoints(): Build SVG path strings for gradient area & stroke
                  │
                  ▼
   [Render MetricCards, SVG Curves, Quality Flags, Length Bins, Mix Bars]
```

---

## 4. Environment Variables (`.env`)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base HTTP endpoint for Express backend | `http://localhost:5000/api` |
| `VITE_WS_URL` | Base WebSocket endpoint for server events | `ws://localhost:5000/ws` |

If `VITE_WS_URL` is omitted, the application automatically derives the WebSocket address from `VITE_API_URL` by replacing `http` with `ws` and `/api` with `/ws`.

---

## 5. Development & Build Scripts

```bash
# Start Vite development server (HMR enabled)
npm run dev

# Run ESLint validation across all JSX and JS files
npm run lint

# Build production bundle to dist/
npm run build

# Preview production build locally
npm run preview
```
