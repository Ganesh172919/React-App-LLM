# AGENTS.md — Instructions & Repository Map for Coding Agents

**Project Name:** MedAssist AI  
**Repository:** `React-App-LLM`  
**Audience:** Coding Agents (Antigravity, Claude Code, Cursor) and Software Engineers  
**Target Invariant:** Zero deletions of baseline documentation files. Continuous 100% test pass rate across 228 automated checks.  

---

## 1. Repository Mission & System Profile

MedAssist AI is a full-stack clinical education and biomedical assistance platform designed to provide evidence-grounded medical explanations, interactive clinical calculators, and deterministic drug interaction safety screening.

- **Frontend:** React 19, Vite 6, Tailwind CSS, Lucide icons, Vitest test harness.
- **Backend:** Node.js 20+, Express 4, MongoDB 7.0 via Mongoose, WebSockets, `node:test` integration harness.
- **Machine Learning & Fine-Tuning:** Python 3.10+, PyTorch, Hugging Face Transformers, PEFT/LoRA adapters, MedQuAD & PubMedQA corpora.
- **AI Orchestration:** Google Gemini API (`@google/genai`), Hugging Face router, Groq / Together AI / local OpenAI-compatible endpoints, NCBI PubMed E-Utilities.

---

## 2. Directory Map & Key Entry Points

```
React-App-LLM/
├── backend/                  # Node.js Express API & WebSocket Server
│   ├── controllers/          # Request handlers (aiController, authController, chatController)
│   ├── middleware/           # Auth tokens, rate limiters, validation, error handlers
│   ├── models/               # Mongoose schemas (User, Chat, Generation, ProviderCredential)
│   ├── routes/               # Express routers (ai, auth, chat, settings, medical)
│   ├── services/             # Core logic (answerService, interactionService, citationService)
│   ├── test/                 # Node.js native integration test suite (MongoMemoryServer)
│   ├── app.js                # Express app factory with dependency injection
│   └── server.js             # HTTP and WebSocket server entry point
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # UI components (auth, chat, dashboard, tools)
│   │   │   └── tools/        # ClinicalCalculatorsModal.jsx (22 clinical scoring tools)
│   │   ├── context/          # React contexts (AuthContext, ThemeContext, ChatContext)
│   │   ├── lib/              # api.js (Web Locks token renewal mutex), utils.js
│   │   └── test/             # Vitest component & unit tests
│   ├── index.html            # SPA HTML entry point
│   └── vite.config.js        # Vite configuration
├── Model and Dataset/        # ML research, dataset audits, and LoRA training
│   ├── lora/                 # LoRA fine-tuning scripts and runbooks
│   └── reports/              # Dataset audits and tokenization analysis
├── deploy/                   # Production Docker, docker-compose, and Nginx configurations
├── docs/                     # Technical documentation suite
│   ├── _meta/                # Baseline manifest, audit report, coverage matrix, verification log
│   ├── records/              # ADRs (decisions/), threat models (threat-models/), model cards
│   └── runbooks/             # Operational incident response runbooks
├── scripts/                  # Verification, maintenance, and test automation scripts
│   └── docs/                 # Preservation guard (check-no-deletions) and freshness scripts
├── AGENTS.md                 # This guide
├── CONTRIBUTING.md           # Contributor onboarding and workflow
└── README.md                 # Root orientation
```

---

## 3. Non-Negotiable Invariants

When working in this repository, you **MUST** strictly adhere to these rules:

1. **Rule R1: Never Delete Baseline Documentation**
   - The 57 baseline documentation files recorded in `docs/_meta/baseline-manifest.txt` must NEVER be deleted, moved, renamed, or truncated.
   - Run `node scripts/docs/check-no-deletions.cjs` before every commit. Zero deletions allowed.
2. **Clinical Calculator Invariants (`ClinicalCalculatorsModal.jsx`)**
   - All 22 clinical tools MUST initialize in an unassessed state (`""` or `null`).
   - No option may default to `0`, `false`, or "Normal".
   - Scores MUST NOT calculate until 100% of required clinical components are assessed.
   - Outputs MUST display educational point tiers only—NEVER raw individual prognostic percentages or life expectancy numbers.
   - MELD calculator MUST remain labeled as historical 2016 MELD-Na (capped at 40) vs OPTN MELD 3.0.
3. **Deterministic DDI Screening (`interactionService.js`)**
   - All 23 FDA Boxed Warning rules must use word boundaries (`\b...\b/i`) and remain deterministic.
   - Both pre-generation prompt screening and post-generation answer screening must be maintained.
4. **Token Renewal Mutex (`frontend/src/lib/api.js`)**
   - Concurrency for token refresh must use `navigator.locks.request("medassist-session-refresh", ...)` with in-memory promise caching to prevent refresh token rotation races.
5. **Two-Phase Generation Handshake**
   - Chat generation (`POST /api/ai/chat`) creates a `Generation` record with idempotency on `exchangeId`.
   - Persistence (`POST /api/chat/save`) validates generation completion and enforces `< 1000` messages and `< 12MB` BSON document size.
6. **No Secrets in Code or Logs**
   - Never commit API keys, tokens, passwords, or PII. Provider keys must be encrypted with AES-256-GCM.

---

## 4. Standard Commands (Test, Build, Lint)

Always execute these commands to verify changes:

```bash
# Preservation Guard (Rule R1)
node scripts/docs/check-no-deletions.cjs

# Backend Integration Test Suite (77 tests)
npm test --prefix backend

# Frontend Vitest Unit Tests (61 tests)
npm test --prefix frontend

# Frontend ESLint Check
npm run lint --prefix frontend

# Frontend Production Build
npm run build --prefix frontend

# Python Research Tests (19 tests)
python -m unittest discover -s "Model and Dataset"
python -m unittest discover -s "Model and Dataset/lora"

# Full Project Multi-Tier Verification Suite (228 automated checks)
node scripts/verify_project.cjs
```

---

## 5. File Ownership & Modification Guidelines

- **Additions vs Modifications:** Prefer adding new files in `docs/records/`, `docs/runbooks/`, or appropriate subdirectories rather than inflating existing monolithic files.
- **Evidence Footers:** Every newly created markdown documentation file must end with an `**Evidence:**` line citing exact file paths and symbols.
- **Admonitions:** Use standard GitHub markdown alerts (`> [!NOTE]`, `> [!WARNING]`, `> [!IMPORTANT]`, `> [!CAUTION]`).

---

**Evidence:** `docs/_meta/system-profile.md`, `docs/_meta/baseline-manifest.txt`, `scripts/docs/check-no-deletions.cjs`, `scripts/verify_project.cjs`.
