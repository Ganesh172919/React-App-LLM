# MedAssist AI

MedAssist AI is a full-stack medical question-and-answer application with authenticated chat history, PubMed-backed responses, server-side Gemini integration, safety checks, and an analytics dashboard.

Developed by **J Ganesh kumar reddy**.

The interface intentionally uses a simple, student-project visual style: clear blue controls, straightforward cards, readable labels, and minimal decorative effects.

> This project provides health information, not diagnosis or medical advice. Urgent symptoms require local emergency services or a qualified clinician.

## What is included

- Responsive React chat workspace with Markdown responses and persistent sessions
- Medical-query routing with PubMed source discovery and visible citations
- Server-side Gemini generation so provider keys are never shipped to the browser
- Citation-grounded medical prompts with a references-only fallback when generation is unavailable
- Reusable conversation-history relevance retrieval
- Custom prompt safeguards for self-harm, harmful instructions, oversized input, and possible emergencies
- User-scoped WebSocket updates, CRUD operations, email verification, password reset, and JWT cookies
- Analytics dashboard for sessions, messages, medical usage, citations, seven-day activity, and dataset quality
- Selectable 7/30/90-day analytics, verification outcomes, answer-length distributions, and JSON export
- Searchable chat history with rename, export, and confirmed deletion actions
- Reproducible CSV profiling, multi-answer auditing, deterministic preparation, and split-leakage validation
- Automated CI for Node tests, frontend lint/build, and Python dataset checks

No model training is performed by the upgraded application or data utilities.

## Upgrade summary

The current version resolves committed merge conflicts and adds several production-focused improvements:

- Moved Gemini calls from the frontend to the backend
- Added authenticated `/api/ai/chat` and `/api/analytics/overview` endpoints
- Scoped WebSocket broadcasts to the authenticated owner of each chat
- Fixed medical-message persistence so a response is saved only once
- Preserved medical flags, references, and verification metadata in chat history
- Added API URL configuration instead of hard-coded browser endpoints
- Completed missing forgot-password and reset-password routes
- Added input validation, authentication rate limiting, health status, CORS configuration, and error handling
- Reworked navigation, landing page, empty chat state, medical-source labeling, and dashboard UI
- Added dataset analysis reports and preparation utilities without invoking the legacy training code
- Added deterministic citation-number validation for PubMed-grounded answers
- Added request IDs, response security headers, body limits, AI rate limits, and privacy-safe WebSocket handling
- Completed chat CRUD with title updates plus client-side search and export

## Project highlights

Developed by **J Ganesh kumar reddy**, with work spanning the React interface, authenticated backend services, medical-data preparation, AI integration, safeguards, analytics, and application testing.

- Built the frontend chat experience with responsive UI/UX and persistent, user-owned conversation management.
- Implemented backend CRUD operations for chats and reusable AI-service endpoints for local and cloud deployments.
- Curated manual medical Q&A data and the MEDQUAD-style CSV. Earlier experiments used LoRA and supervised fine-tuning; the production upgrade does not run training.
- Added hallucination controls through source-bounded medical prompts, PubMed references, citation-number validation, and explicit verification metadata.
- Integrated Gemini on the server and retained lightweight relevance retrieval for prior conversation context.
- Added medical guardrails, harmful-message filtering, operational analytics, dataset-quality visualization, and automated behavior checks.
- Earlier model experimentation reported a 60% GPU-memory reduction through parameter-efficient fine-tuning. That benchmark is project-reported and is not rerun by this repository upgrade.

## Architecture & System Flows

Comprehensive architectural documentation, end-to-end mindmaps, and detailed ASCII flows are available in the dedicated documentation guides:
- [System Architecture, Mindmaps & ASCII Flows](docs/SYSTEM_ARCHITECTURE_MINDMAPS_AND_FLOWS.md)
- [Backend Architecture & API Guide](backend/README.md)
- [Frontend Architecture & Component Guide](frontend/README.md)
- [Dataset Profiling, Auditing & Splitting Pipeline](Model%20and%20Dataset/README.md)

### System Mindmap Flow

```text
[MedAssist AI Platform]
  │
  ├── Frontend Client (React 19 + Vite 6 + Tailwind 4)
  │     ├── Chat Workspace: Markdown rendering, code blocks, citations, badges
  │     ├── Dual-Path Query Dispatch: PubMed literature route vs. Gemini AI route
  │     ├── Session Management: Grouped history, title search, inline rename, export, delete
  │     ├── Real-Time Sync: WebSocket listener with exponential backoff reconnects
  │     └── Operations Dashboard: 7/30/90-day SVG activity trends, verification stats
  │
  ├── Express + WebSocket Gateway (server.js + app.js)
  │     ├── Security Shield: UUID tracing, security headers, CORS whitelist, 32kb limits
  │     ├── Rate Limiters: aiLimiter (20 req/min) & authLimiter (30 req/15 min)
  │     ├── Cookie-Based JWT Auth: 15-minute accessToken & 7-day refreshToken
  │     ├── User-Scoped WebSocket Broadcasts: Emits CHAT_UPDATE strictly to chat owner
  │     └── Health Endpoint: /api/health with DB status, uptime, and AI configuration
  │
  ├── AI, Grounding & Safety Engine
  │     ├── Safety Screening: Rejects self-harm, harmful acts; flags emergencies
  │     ├── Context Retrieval: Fast token-overlap relevance over prior user chats
  │     ├── PubMed Grounding: Live NCBI eUtils article search (esearch + esummary)
  │     ├── Constrained Generation: Gemini 3.8 Flash bounded strictly to retrieved records
  │     └── Citation Grounding Audit: Validates [1]..[N] claims and reports coverage %
  │
  └── Dataset Utilities Pipeline (Model and Dataset/)
        ├── analyze_dataset.py: Descriptive profiling, length percentiles, quality flags
        ├── audit_dataset.py: Repeated question audit, Jaccard answer similarity, URL checks
        ├── prepare_dataset.py: Deduplication, longest-answer pick, deterministic SHA-256 splits
        └── verify_splits.py: Cross-split leakage validation (asserts 0 overlap)
```

### End-to-End Query & Grounding ASCII Flow

```text
Client Browser            Express Backend                NCBI PubMed API          Google Gemini          MongoDB
      │                          │                              │                       │                   │
  [1] │── Types health query ───>│                              │                       │                   │
      │   isMedicalQuery() == T  ├─ authToken (JWT verify)      │                       │                   │
      │   POST /api/medical      ├─ screenPrompt()              │                       │                   │
      │                          │                              │                       │                   │
  [2] │                          ├─ esearch.fcgi?term=query ───>│                       │                   │
      │                          │<─ { idlist: [pmid1, pmid2] }─┤                       │                   │
      │                          ├─ esummary.fcgi?id=pmids ────>│                       │                   │
      │                          │<─ { articles: metadata } ────┤                       │                   │
      │                          │                                                      │                   │
  [3] │                          ├─ Build Bounded Context: [1]..., [2]...               │                   │
      │                          ├─ generateWithGemini() ──────────────────────────────>│                   │
      │                          │<─ Answer with inline citations [1], [2] ─────────────┤                   │
      │                          │                                                                          │
  [4] │                          ├─ assessCitationGrounding(response, 2)                                    │
      │                          │  - Checks citation numbers against source count                          │
      │                          │  - Status: "citation_checked", Grounded: true                            │
      │                          │                                                                          │
  [5] │<── 200 OK Response ──────┤                                                                          │
      │    - Formatted text      │                                                                          │
      │    - References metadata │                                                                          │
      │    - Verification audit  │                                                                          │
      │                          │                                                                          │
  [6] │── POST /api/save ───────>│                                                                          │
      │   Save exchange payload  ├─ chatController.saveChat()                                               │
      │                          ├─ Append message to session ─────────────────────────────────────────────>│
      │                          ├─ broadcastUpdate(chat, userId)                                           │
      │                          │  (Pushes CHAT_UPDATE to connected WebSocket clients)                    │
      │<── 201 Created ──────────┤                                                                          │
```

## Dataset analysis

The source CSV contains `question` and `answer` fields. The committed report was generated by `Model and Dataset/analyze_dataset.py`.

| Metric | Result |
| --- | ---: |
| Source rows | 16,412 |
| Valid question-answer pairs | 16,407 |
| Missing answers | 5 |
| Exact duplicates after whitespace normalization | 48 |
| Unique normalized questions | 14,345 |
| Repeated normalized question rows | 2,062 |
| Median question length | 7 words |
| Median answer length | 132 words |
| Multi-answer question groups | 1,396 |
| Multi-answer groups below 0.35 token similarity | 1,128 |
| Answers containing URLs | 159 |

The report is descriptive. It does not establish clinical correctness, licensing, or source provenance. Before any future retrieval evaluation or training, review conflicting repeated questions, attach provenance and licensing metadata, and clinically validate the content.

Generate fresh reports:

```powershell
python "Model and Dataset/analyze_dataset.py"
python "Model and Dataset/audit_dataset.py"
```

Create clean, question-level deterministic splits in a separate directory:

```powershell
python "Model and Dataset/prepare_dataset.py" --output-dir .\prepared-data
python "Model and Dataset/verify_splits.py" --input-dir .\prepared-data
```

The preparation script keeps the source CSV unchanged, retains the longest answer for a repeated normalized question, removes missing or very short answers, and uses a SHA-256 question key for an 80/10/10 split. It does not train a model.

## Project structure

```text
.
├── backend/
│   ├── controllers/       # Auth, chat, medical, AI, and analytics handlers
│   ├── middleware/        # JWT cookie authentication
│   ├── models/            # MongoDB user and chat models
│   ├── routes/            # REST endpoints
│   ├── services/          # Gemini, safety, email, and history retrieval
│   ├── test/              # Node unit tests
│   ├── app.js
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/    # Auth, chat navigation, landing, and dashboard UI
│       ├── context/       # Authentication and sidebar state
│       ├── lib/           # Configurable API client
│       └── utils/         # Medical query detection
└── Model and Dataset/
    ├── analyze_dataset.py
    ├── audit_dataset.py
    ├── prepare_dataset.py
    ├── verify_splits.py
    ├── test_dataset_tools.py
    ├── reports/
    ├── Final data set for llm based health assitance (1).csv
    └── Fine-tunned model.py  # Legacy Colab export; not used by the app
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- MongoDB 7 or a compatible MongoDB Atlas deployment
- Python 3.10 or newer for dataset utilities
- Gemini API key for generated responses
- Brevo credentials only when email verification and password reset delivery are required

For Brevo email delivery, set `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS`, and
`EMAIL_FROM_NAME`. Verification and reset links use `FRONTEND_URL` when set,
or the first configured `CLIENT_ORIGIN` as a fallback.

## Local setup

### 1. Backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

Configure `backend/.env`:

```dotenv
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/medassist
CLIENT_ORIGIN=http://localhost:5173

JWT_ACCESS_TOKEN=replace-with-a-long-random-secret
JWT_REFRESH_TOKEN=replace-with-a-different-long-random-secret
JWT_VERIFICATION_TOKEN=replace-with-a-different-long-random-secret
JWT_RESET_TOKEN=replace-with-a-different-long-random-secret

GEMINI_API_KEY=your-server-side-key
GEMINI_MODEL=gemini-3.8-flash
```

Never use a `VITE_` prefix for server secrets. Vite exposes `VITE_` values to browser code.

### 2. Frontend

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Default development endpoints:

```dotenv
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000/ws
```

Open `http://localhost:5173`.

## Commands

### Frontend

```powershell
npm run dev
npm run lint
npm run build
```

### Backend

```powershell
npm run dev
npm start
npm test
```

### Dataset utilities

```powershell
python -m unittest discover -s "Model and Dataset" -p "test_*.py"
python "Model and Dataset/analyze_dataset.py"
python "Model and Dataset/audit_dataset.py"
```

### LoRA preparation (no training)

The maintained LoRA package validates adapter settings and converts prepared CSV rows to SFT JSONL. It never downloads a model or starts training.

```powershell
cd "Model and Dataset/lora"
python validate_lora_setup.py --output ../reports/lora_validation.json
python -m unittest test_lora_tools.py
```

See `Model and Dataset/lora/README.md` for the data-conversion command and safety boundary.

### Project report

The ten-page release report is committed at `output/pdf/medassist_ai_project_report.pdf`. Regenerate it after updating dataset reports or release evidence:

```powershell
python scripts/generate_project_report.py
```

The report covers architecture, UI/UX, dataset findings, the no-training LoRA scaffold, backend safeguards, deployment, live browser QA, limitations, and next steps.

## Container deployment

The production containers use one public origin: Nginx serves the React single-page application and proxies `/api` and `/ws` to the Node service. This avoids browser cookie and CORS inconsistencies between separately hosted frontend and backend origins.

```powershell
Copy-Item .env.docker.example .env
# Replace every JWT placeholder with a unique random secret.
docker compose up --build -d
```

Open `http://localhost:8080`. For HTTPS deployment, set `PUBLIC_ORIGIN` to the exact public origin and `COOKIE_SECURE=true`. The backend and frontend images include health checks; MongoDB persists to the `medassist-mongo` volume.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | API, database, and AI configuration status |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Start an authenticated cookie session |
| `GET` | `/api/auth/check` | Read the current session |
| `POST` | `/api/auth/logout` | End the session |
| `POST` | `/api/auth/refresh-token` | Refresh the access cookie |
| `POST` | `/api/auth/forgot-password` | Request a reset email |
| `POST` | `/api/auth/reset-password` | Apply a password reset token |
| `GET` | `/api/history` | List the authenticated user's chats |
| `POST` | `/api/save` | Create or update a chat |
| `DELETE` | `/api/delete` | Delete an owned chat |
| `PATCH` | `/api/chats/:sessionId` | Rename an owned chat |
| `DELETE` | `/api/chats/:sessionId` | Delete an owned chat using the REST-style route |
| `POST` | `/api/ai/chat` | Generate a safeguarded general response |
| `POST` | `/api/medical` | Search PubMed and create a grounded medical response |
| `GET` | `/api/analytics/overview?days=7` | Load user and dataset metrics for a 7, 30, or 90-day trend |

## Safety and privacy notes

- WebSocket messages are filtered by authenticated user ID.
- Access and refresh tokens use HTTP-only cookies.
- Gemini keys remain in backend environment variables.
- Medical grounding uses PubMed metadata and visible links, but source presence is not proof that every answer is clinically correct.
- Citation validation checks whether numbered citations map to supplied PubMed records; it does not independently establish factual or clinical correctness.
- The custom filter is a first safety layer, not a replacement for provider safety systems, monitoring, or professional review.
- Conversation retrieval uses local token-overlap relevance scoring over the authenticated user's recent stored chats. It is intentionally lightweight and is not a vector database.

## Legacy model file

`Model and Dataset/Fine-tunned model.py` is now a safe compatibility shim that points to the maintained `lora/` package. The invalid Colab export, embedded base64 image, automatic training, and upload steps were removed. No model training was performed during this upgrade.

## Original team

- 23bds011 — B varshith
- 23bds024 — J Ganesh kumar reddy
- 23bds015 — B Harsha
- 23bds033 — M Jagadeeswar
- 23bds053 — Izhaar ahmed

## License

MIT License. See `LICENSE`.
