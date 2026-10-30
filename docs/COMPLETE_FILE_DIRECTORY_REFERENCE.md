# MedAssist AI — Complete Repository File & Module Reference

Developed by **J Ganesh kumar reddy**  
*Full-Stack Educational Health Assistance, Biomedical Evidence Grounding, & Machine Learning Research Platform*

---

## 1. Complete Repository ASCII Directory Tree

```
c:\Users\RAVIPRAKASH\React-App-LLM\
├── .dockerignore                            # Excludes dev files from Docker build contexts
├── .env.docker.example                      # Production environment template for Docker Compose
├── .gitattributes                           # Line ending normalization (LF for scripts, auto for text)
├── .gitignore                               # Git ignore list (node_modules, logs, tmp, prepared data)
├── docker-compose.yml                       # Multi-container orchestration (mongo, backend, frontend)
├── IMPROVEMENT_PLAN.md                      # Release checklist, roadmap, and milestone tracking
├── LICENSE                                  # MIT Software License
├── README.md                                # Root platform manual, quickstarts, and run instructions
│
├── .github/
│   └── workflows/
│       └── ci.yml                           # 5-job GitHub Actions workflow (test, lint, build, audit)
│
├── backend/                                 # Express 4 + Node 24 + MongoDB REST & WebSocket Service
│   ├── .dockerignore                        # Backend Docker context exclusions
│   ├── .env.example                         # Backend environment variables template
│   ├── .gitignore                           # Backend ignore list
│   ├── app.js                               # Express application factory with middleware pipeline
│   ├── Dockerfile                           # Multi-stage production container for Node 24 service
│   ├── package.json                         # Backend dependencies, metadata, and test scripts
│   ├── README.md                            # Comprehensive backend technical architecture manual
│   ├── server.js                            # HTTP & WebSocket process entry point
│   │
│   ├── controllers/                         # HTTP Route Handlers
│   │   ├── aiController.js                  # Two-phase AI generation coordinator
│   │   ├── analyticsController.js           # Lifetime stats, UTC activity trends, dataset audit
│   │   ├── authController.js                # Auth, registration, password recovery, account wipe
│   │   ├── chatController.js                # Authoritative message persistence (/api/save), history
│   │   ├── medicalController.js             # Forced medical literature grounding handler
│   │   ├── oauthController.js               # Google OAuth 2.0 PKCE flow & OpenID token exchange
│   │   └── settingsController.js            # User preferences and AES-256-GCM key management
│   │
│   ├── middleware/                          # Express Middleware
│   │   └── authToken.js                     # Validates HttpOnly access cookie & sessionVersion
│   │
│   ├── models/                              # Mongoose Database Schemas
│   │   ├── chatModel.js                     # Chat threads, messages, references, citation audits
│   │   ├── generationModel.js               # Ephemeral in-flight generations with 24-hour TTL
│   │   ├── providerCredentialModel.js       # AES-256-GCM encrypted user API keys
│   │   └── userModel.js                     # User profile, salted bcrypt hash, sessionVersion
│   │
│   ├── routes/                              # Express Route Definitions
│   │   ├── aiRoute.js                       # POST /api/ai/chat
│   │   ├── analyticsRoute.js                # GET /api/analytics/overview
│   │   ├── authRoute.js                     # /api/auth/* (register, login, google, refresh, reset)
│   │   ├── chatRoute.js                     # /api/save, /api/history, /api/chats/:id
│   │   ├── medicalRoute.js                  # POST /api/medical
│   │   └── settingsRoute.js                 # /api/settings/* (GET/PATCH settings, PUT/DELETE keys)
│   │
│   ├── services/                            # Core Business Logic & External Integrations
│   │   ├── aiService.js                     # Google Gemini API client with context formatting
│   │   ├── answerService.js                 # Dual-engine router, safety gate, grounding coordinator
│   │   ├── answerVerifier.js                # Secondary LLM consensus reviewer (SUPPORTED/UNSUPPORTED)
│   │   ├── citationService.js               # Deterministic [N] numerical citation verification
│   │   ├── config.js                        # Environment variable validation on startup
│   │   ├── emailService.js                  # Brevo (Sendinblue) transactional email dispatcher
│   │   ├── historySearch.js                 # Conversational context turn relevance ranker
│   │   ├── interactionService.js            # 14 FDA black-box drug-drug interaction warning rules
│   │   ├── modelProvider.js                 # Multi-provider client (Gemini, Groq, Together, Local)
│   │   ├── providerCredentials.js           # AES-256-GCM authenticated cipher vault (seal/open)
│   │   ├── providerSelection.js             # Multi-provider routing and key resolution logic
│   │   ├── pubmedService.js                 # NCBI Entrez client (esearch, esummary, efetch) & XML parser
│   │   ├── safetyService.js                 # Deterministic prompt and generated output screener
│   │   ├── sessionService.js                # Dual JWT issuance, SHA-256 hash match, cookie options
│   │   ├── validation.js                    # Schema validators for UUIDs, email, allowed JSON keys
│   │   └── websocketService.js              # WebSocket server on /ws with 30s heartbeat watchdog
│   │
│   └── test/                                # Automated Backend Test Suites
│       ├── application.test.js              # Integration suite with MongoMemoryServer
│       ├── chatTitle.test.js                # Auto-titling sanitization tests
│       ├── citationService.test.js          # Unit tests for numerical citation verification
│       ├── historySearch.test.js            # Unit tests for conversation token overlap selection
│       ├── interactionService.test.js       # Unit tests for pharmacological drug interaction screening
│       ├── modelProvider.test.js            # Unit tests for multi-provider API resolution
│       ├── providers.test.js                # Unit tests for PubMed UID sorting & XML parsing
│       ├── pubmedService.test.js            # Unit tests for PubMed query string generation
│       └── safetyService.test.js            # Unit tests for crisis, emergency, and harm screening
│
├── deploy/                                  # Deployment & Infrastructure Automation
│   ├── create_env.cjs                       # Generates production .env with random 32-byte hex secrets
│   └── mongo-init.js                        # Mongo container bootstrap script (creates app user)
│
├── docs/                                    # Technical Documentation Suite
│   ├── AI_ARCHITECTURE_AND_WORKING_PRINCIPLES.md # Concise AI grounding summary
│   ├── AI_FINE_TUNING_AND_LORA_GUIDE.md     # Concise LoRA guide
│   ├── COMPLETE_FILE_DIRECTORY_REFERENCE.md # This comprehensive file inventory
│   ├── COMPREHENSIVE_CODEBASE_ANALYSIS.md   # Architectural codebase breakdown
│   ├── CURRENT_IMPLEMENTATION.md            # Detailed runtime specification & API schemas
│   ├── DEEP_DIVE_AI_WORKING_PRINCIPLES.md   # Mathematical RAG treatise & E-Utilities deep dive
│   ├── DEEP_DIVE_LORA_AND_FINE_TUNING.md    # LoRA mathematical derivations & SFT backprop
│   ├── DEPLOYMENT_RUNBOOK.md                # Enterprise Docker Compose & operations runbook
│   ├── EVALUATION_AND_INTEGRATION.md        # Ablation benchmark scoring & document retrieval
│   ├── IMPLEMENTATION_STATUS.md             # Verification test evidence & audit matrix
│   ├── README.md                            # Documentation suite master index & mindmap
│   └── SECURITY_AND_MESSAGE_POLICY.md       # Trust boundaries, AES-256-GCM vault, OWASP defenses
│
├── frontend/                                # React 19 Single Page Application
│   ├── .dockerignore                        # Frontend container exclusions
│   ├── .env.example                         # Frontend environment variables template
│   ├── .gitignore                           # Frontend gitignore
│   ├── Dockerfile                           # Multi-stage production container with Nginx
│   ├── eslint.config.js                     # ESLint configuration
│   ├── index.html                           # HTML template with viewport and meta tags
│   ├── nginx.conf                           # Production reverse proxy and static asset server
│   ├── package.json                         # Frontend dependencies (React 19, Tailwind 4, Lucide)
│   ├── README.md                            # Comprehensive frontend architectural manual
│   ├── tailwind.config.js                   # Tailwind CSS styling configuration
│   ├── vite.config.js                       # Vite bundler configuration with /api & /ws proxies
│   ├── vitest.config.js                     # Vitest test runner configuration
│   │
│   └── src/                                 # Frontend Application Source
│       ├── App.jsx                          # Router definition, global header/footer layout
│       ├── index.css                        # Tailwind CSS styles and UI utilities
│       ├── main.jsx                         # React root entry point with StrictMode
│       ├── assets/react.svg                 # React brand asset
│       │
│       ├── components/                      # Modular UI Components
│       │   ├── Login.jsx                    # Login form view
│       │   ├── Register.jsx                 # Registration form view
│       │   ├── Sidebar.jsx                  # Conversation history navigation drawer
│       │   ├── auth/                        # Authentication & Account Views
│       │   │   ├── AccountPage.jsx          # Privacy notices and permanent account wipe modal
│       │   │   ├── AISettings.jsx           # Provider selector & AES-256-GCM key manager
│       │   │   ├── AuthPage.jsx             # Unified authentication modal
│       │   │   ├── ForgotPassword.jsx       # Password recovery request form
│       │   │   ├── ResetPassword.jsx        # Password reset via JWT token form
│       │   │   ├── VerificationPending.jsx  # Notification view for unverified email
│       │   │   └── VerifyEmail.jsx          # Email token activation handler
│       │   ├── chat/                        # Conversational Workspace
│       │   │   └── ChatWorkspace.jsx        # Message feed, markdown renderer, composer
│       │   ├── dashboard/                   # Operational Analytics Dashboard
│       │   │   └── AnalyticsDashboard.jsx   # Metrics cards, SVG activity charts, audit
│       │   ├── footer/Footer.jsx            # Student attribution footer
│       │   ├── header/Header.jsx            # Top navigation bar with auth status
│       │   ├── home/Home.jsx                # Public landing page with system notices
│       │   └── tools/                       # Evidence-Based Clinical Tools
│       │       └── ClinicalCalculatorsModal.jsx # 13-calculator educational suite with WAI-ARIA tabs
│       │
│       ├── context/                         # React State Contexts
│       │   ├── AuthContext.jsx              # User session state, sign-in, sign-out handler
│       │   └── SidebarContext.jsx           # Mobile drawer open/close visibility state
│       │
│       ├── lib/                             # Client Utilities
│       │   ├── api.js                       # Fetch client with Web Locks token renewal
│       │   ├── conversationImport.js        # Bounded local JSON parser with forged-metadata stripping
│       │   └── tabStorage.js                # Resilient draft and pending job recovery
│       │
│       ├── test/                            # Frontend Automated Test Suites
│       │   ├── api.test.js                  # Web Locks concurrent token renewal tests
│       │   ├── clinicalCalculators.test.jsx # Unit tests for 13 clinical calculators & bounds
│       │   ├── conversationImport.test.js   # Unit tests for conversation import security & stripping
│       │   ├── medicalDetector.test.js      # Heuristic clinical prompt detection tests
│       │   ├── tabStorage.test.js           # Resilient storage fallback tests
│       │   └── ui.test.jsx                  # Component tests for auth, chat, and dashboard
│       │
│       └── utils/
│           └── medicalDetector.js           # Client-side heuristic medical keyword detector
│
├── Model and Dataset/                       # Dataset Engineering & Offline LoRA Pipeline
│   ├── Final data set... (1).csv            # Raw medical Q&A dataset (16,412 rows)
│   ├── Fine-tunned model.py                 # Historical reference fine-tuning script
│   ├── README.md                            # Comprehensive dataset engineering manual
│   ├── requirements-document-retrieval.txt  # Dependencies for offline document retrieval
│   ├── analyze_dataset.py                   # Descriptive statistics, percentiles, term frequencies
│   ├── audit_dataset.py                     # Jaccard similarity audit of multi-answer variants
│   ├── document_retrieval.py                # Standalone lexical document search with OCR fallback
│   ├── evaluate_benchmark.py                # Paired case ablation score analyzer
│   ├── prepare_dataset.py                   # Deterministic SHA-256 modulo 100 partitioner
│   ├── test_benchmark.py                    # Unit tests for evaluation benchmark analyzer
│   ├── test_dataset_tools.py                # Unit tests for dataset cleaning and hashing
│   ├── test_document_retrieval.py           # Unit tests for local semantic search utility
│   ├── test_release_data.py                 # Regression tests for split file completeness
│   ├── verify_splits.py                     # Cross-partition question leakage validator
│   │
│   ├── lora/                                # Offline LoRA Parameter-Efficient Fine-Tuning
│   │   ├── build_lora_package.py            # Quarantines 1,437 multi-answer groups & builds splits
│   │   ├── evaluation_cases.json            # Behavioral evaluation cases
│   │   ├── infer_adapter.py                 # Standalone CLI for local adapter testing
│   │   ├── lora_config.json                 # LoRA hyperparameter configuration
│   │   ├── lora_config.py                   # Strongly typed dataclass for LoRA parameters
│   │   ├── prepare_sft_records.py           # Converts CSV splits to SFT JSONL format
│   │   ├── README.md                        # Comprehensive LoRA engineering manual
│   │   ├── requirements-qlora.txt           # Dependencies for 4-bit NF4 QLoRA
│   │   ├── requirements-training.txt        # Dependencies for offline PyTorch/PEFT training
│   │   ├── test_lora_tools.py               # Unit tests for SFT record creation
│   │   ├── test_release_lora.py             # Regression tests for review gate enforcement
│   │   ├── train_lora.py                    # Dry-run inspector & review-gated SFT script
│   │   └── validate_lora_setup.py           # Closed-form parameter and memory calculator
│   │
│   └── reports/                             # Generated Dataset & LoRA Audit Reports
│       ├── dataset_analysis.json            # Descriptive statistics output
│       ├── dataset_analysis.md              # Markdown summary of dataset analysis
│       ├── dataset_audit.json               # Multi-answer variant similarity output
│       ├── dataset_audit.md                 # Markdown summary of dataset audit
│       └── lora_validation.json             # Parameter estimation report (147,456 params)
│
└── scripts/                                 # Verification & Operations Automation
    ├── browser_smoke.cjs                    # Playwright browser smoke test suite (12 scenarios)
    ├── check_build_serving.cjs              # Automated HTTP assertions against built-output server
    ├── generate_project_report.py           # Compiles documentation and test logs into PDF report
    ├── run_build_qa.cjs                     # Serves built frontend bundle and API on port 4173
    ├── run_local.cjs                        # Isolated local stack with in-memory Mongo & fixtures
    └── verify_project.cjs                   # Master verification aggregator executing all checks
```

---

## 2. File Classification Mindmap

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0284c7', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#0369a1', 'lineColor': '#0284c7', 'secondaryColor': '#0d9488', 'tertiaryColor': '#6366f1' }}}%%
mindmap
  root((Repository Architecture))
    ::icon(fa fa-folder-open)
    (01 Backend Subsystem)
      Server & App Factory (server.js, app.js)
      Controllers (auth, chat, ai, medical, oauth, settings, analytics)
      Middleware (authToken.js)
      Mongoose Models (user, chat, generation, providerCredential)
      Routes (auth, chat, ai, medical, settings, analytics)
      Services (answer, pubmed, ai, citation, verifier, providerSelection, session, websocket)
      Automated Tests (node test runner suites)
    (02 Frontend Subsystem)
      Core Views (Home, ChatWorkspace, AnalyticsDashboard, AccountPage, AISettings)
      Context Providers (AuthContext, SidebarContext)
      Client Utilities (api.js Web Locks, tabStorage.js)
      Vite & Tailwind (vite.config.js, tailwind.config.js, index.css)
      Nginx Configuration (nginx.conf)
      Vitest Test Suites (api, tabStorage, ui)
    (03 Model & Dataset Subsystem)
      Source Data (Final dataset CSV)
      Dataset Profilers (analyze_dataset, audit_dataset)
      Dataset Preparation (prepare_dataset, verify_splits)
      Offline Semantic Search (document_retrieval.py)
      Benchmark Analysis (evaluate_benchmark.py)
      LoRA Package (build_lora_package, validate_lora_setup, train_lora)
    (04 Automation & Tooling)
      Docker Compose & Deployment (docker-compose.yml, create_env.cjs, mongo-init.js)
      Test Automation (verify_project.cjs, browser_smoke.cjs, run_build_qa.cjs)
      PDF Report Generator (generate_project_report.py)
```

---

## 3. Subsystem File Index & Detailed Technical Specifications

### 3.1 Backend Application Files

| File Path | Role | Exported Symbols / Functions | Upstream Dependencies |
| :--- | :--- | :--- | :--- |
| `backend/server.js` | Process Entrypoint | Starts HTTP and WebSocket server on `PORT` (5000). | `app.js`, `websocketService.js`, `config.js` |
| `backend/app.js` | Express Factory | `createApp({ services, limits })` | Express, CORS, CookieParser, RateLimit |
| `backend/controllers/authController.js` | Auth Handlers | `register`, `login`, `logout`, `refreshToken`, `verifyEmail`, `resendVerification`, `forgotPassword`, `resetPassword`, `deleteAccount` | `userModel.js`, `sessionService.js`, `emailService.js` |
| `backend/controllers/oauthController.js` | Google OAuth | `status`, `start`, `callback` | `google-auth-library`, `crypto`, `jsonwebtoken`, `userModel.js` |
| `backend/controllers/settingsController.js` | User Settings | `getSettings`, `updateSettings`, `saveKey`, `deleteKey` | `providerCredentialModel.js`, `providerCredentials.js`, `userModel.js` |
| `backend/controllers/aiController.js` | Two-Phase AI | `generateChatResponse` | `answerService.js`, `generationModel.js` |
| `backend/controllers/chatController.js` | Persistence | `saveExchange`, `getHistory`, `getChatById`, `renameChat`, `deleteChat` | `chatModel.js`, `generationModel.js` |
| `backend/controllers/medicalController.js` | Forced Medical | `handleMedicalQuery` | `answerService.js`, `generationModel.js` |
| `backend/controllers/analyticsController.js` | Telemetry | `getOverview` | `chatModel.js`, `generationModel.js`, `userModel.js` |
| `backend/middleware/authToken.js` | Auth Gate | Express middleware attaching `req.user` | `sessionService.js` |
| `backend/models/userModel.js` | User Schema | Mongoose `User` model | `mongoose`, `bcryptjs` |
| `backend/models/providerCredentialModel.js` | Vault Schema | Mongoose `ProviderCredential` model | `mongoose` |
| `backend/models/chatModel.js` | Chat Schema | Mongoose `Chat` model | `mongoose` |
| `backend/models/generationModel.js` | Ephemeral Buffer | Mongoose `Generation` model (24h TTL) | `mongoose` |
| `backend/services/pubmedService.js` | PubMed Client | `buildPubMedQuery`, `orderedRecords`, `parseAbstracts`, `fetchSources` | `axios`, `fast-xml-parser` |
| `backend/services/citationService.js` | Citation Audit | `assessCitationGrounding` | Standard regex |
| `backend/services/interactionService.js` | Drug Interaction Screener | `detectDrugInteractions`, `HIGH_RISK_INTERACTION_RULES` | Standard regex & 14 FDA black-box warning pairs |
| `backend/services/answerVerifier.js` | Model Review | `verifyAnswer` | `aiService.js` |
| `backend/services/providerCredentials.js` | AES-256-GCM Vault | `seal`, `open` | `crypto` |
| `backend/services/providerSelection.js` | Multi-Provider Engine | `resolveProviderSelection`, `listChoices`, `defaultProvider` | `providerCredentialModel.js`, `userModel.js` |
| `backend/services/modelProvider.js` | AI Dispatcher | `generateAnswer`, `generateWithOpenAICompatible` | `axios`, `aiService.js` |
| `backend/services/aiService.js` | Gemini Client | `generateWithGemini` | `axios` |
| `backend/services/safetyService.js` | Safety Screener | `screenPrompt`, `screenGeneratedAnswer` | Standard regex |
| `backend/services/sessionService.js` | Token Crypto | `hashToken`, `cookieOptions`, `makeTokens`, `setCookies`, `authenticate` | `jsonwebtoken`, `crypto` |
| `backend/services/websocketService.js` | Real-Time Sync | `attachWebSockets` | `ws`, `cookie`, `sessionService.js` |

---

### 3.2 Frontend Application Files

| File Path | Role | Exported Symbols / Components | Upstream Dependencies |
| :--- | :--- | :--- | :--- |
| `frontend/src/main.jsx` | Client Entry | Mounts `<App />` within `StrictMode` and `AuthProvider`. | React 19, ReactDOM |
| `frontend/src/App.jsx` | Router Root | `<App />` | React Router 7 |
| `frontend/src/context/AuthContext.jsx` | Session State | `AuthContext`, `AuthProvider`, `useAuth` | React, `lib/api.js` |
| `frontend/src/context/SidebarContext.jsx` | Drawer State | `SidebarContext`, `SidebarProvider`, `useSidebar` | React |
| `frontend/src/components/chat/ChatWorkspace.jsx` | Chat UI | `<ChatWorkspace />` | `react-markdown`, `tabStorage.js`, `api.js` |
| `frontend/src/components/dashboard/AnalyticsDashboard.jsx` | Metrics Dashboard | `<AnalyticsDashboard />` | `lib/api.js`, Lucide icons |
| `frontend/src/components/tools/ClinicalCalculatorsModal.jsx` | Clinical Tools | `<ClinicalCalculatorsModal />` | 13 evidence-based calculators with WAI-ARIA tab semantics |
| `frontend/src/components/auth/AccountPage.jsx` | Account Manager | `<AccountPage />` | `AuthContext.jsx`, `tabStorage.js` |
| `frontend/src/components/auth/AISettings.jsx` | Provider Settings | `<AISettings />` | `lib/api.js` |
| `frontend/src/components/auth/AuthPage.jsx` | Auth Modal | `<AuthPage />` | React |
| `frontend/src/lib/api.js` | API Wrapper | `apiRequest`, `refreshSession`, `getWebSocketUrl`, `downloadJson` | Web Locks API, Fetch API |
| `frontend/src/lib/conversationImport.js` | Import Parser | `parseConversationImport`, `MAX_IMPORT_BYTES` | Standard text encoders & JSON parser |
| `frontend/src/lib/tabStorage.js` | Resilient Cache | `readTab`, `writeTab`, `readPending` | Browser `sessionStorage` |
| `frontend/src/utils/medicalDetector.js` | Client Heuristics | `isMedicalPrompt` | Regular expressions |

---

### 3.3 Dataset & LoRA Pipeline Files

| File Path | Role | Exported Symbols / Functions | Upstream Dependencies |
| :--- | :--- | :--- | :--- |
| `Model and Dataset/analyze_dataset.py` | Profiler | `analyze_dataset()` | `csv`, `json`, `pathlib` |
| `Model and Dataset/audit_dataset.py` | Variant Auditor | `audit_dataset()` | `csv`, `hashlib`, `math` |
| `Model and Dataset/prepare_dataset.py` | Partitioner | `load_and_clean`, `stable_split`, `write_split`, `file_sha256` | `hashlib`, `csv` |
| `Model and Dataset/verify_splits.py` | Leakage Check | `validate_splits()` | `csv`, `pathlib` |
| `Model and Dataset/evaluate_benchmark.py` | Ablation Tool | `summarize()` | `csv`, `collections` |
| `Model and Dataset/document_retrieval.py` | Semantic Search | `build_index`, `search_index`, `read_document` | `sentence-transformers`, `fitz`, `pytesseract` |
| `Model and Dataset/lora/build_lora_package.py` | LoRA Partitioner | `build()` | `prepare_dataset.py`, `verify_splits.py` |
| `Model and Dataset/lora/validate_lora_setup.py` | Parameter Calc | `estimate_adapter_parameters`, `calculate_memory_footprint_mb` | `lora_config.py` |
| `Model and Dataset/lora/train_lora.py` | SFT Script | `train_lora()`, dry-run inspector | `torch`, `transformers`, `peft` |
| `Model and Dataset/lora/infer_adapter.py` | Adapter Test CLI | Interactive generation CLI | `peft`, `transformers` |
| `Model and Dataset/lora/lora_config.py` | Config Validator | `LoraTrainingConfig`, `load_lora_config` | `dataclasses`, `json` |
