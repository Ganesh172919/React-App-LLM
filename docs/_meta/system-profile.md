# System Profile: MedAssist AI

**Date:** 2026-11-08  
**Profile Version:** 1.0.0  
**Project One-Liner:** Privacy-first clinical decision support platform combining NCBI PubMed biomedical evidence grounding, 23 high-risk DDI screening rules, 22 clinical calculators, and multi-provider AI reasoning.

---

## 1. Runtime Languages and Versions

- **Node.js**: v20+ runtime; tested and verified on Node.js v24.16.0.  
  *Evidence:* `package.json`, `backend/package.json`, `frontend/package.json`, `.github/workflows/ci.yml`.
- **Python**: Python 3.10+ (standard library only for dataset tools, profiling, and LoRA math verification).  
  *Evidence:* `Model and Dataset/requirements-document-retrieval.txt`, `Model and Dataset/lora/requirements-training.txt`.
- **Browser Runtime**: Modern evergreen browsers (Chromium, Firefox, WebKit) with WAI-ARIA and CSS variables.  
  *Evidence:* `frontend/vite.config.js`, `frontend/src/index.css`, `scripts/browser_smoke.cjs`.

---

## 2. Core Frameworks and Application Architecture

- **Backend Web Server**: Express.js 4.21 with native HTTP and WebSocket (`ws`) duplex streaming.  
  *Evidence:* `backend/app.js`, `backend/server.js`, `backend/package.json`.
- **Frontend SPA**: React 19 (`react`, `react-dom`) bundled via Vite 6 with `react-markdown` and `lucide-react`.  
  *Evidence:* `frontend/package.json`, `frontend/vite.config.js`, `frontend/src/App.jsx`.
- **Security Middleware**: CORS origin verification, custom Content-Security-Policy (CSP), `X-Content-Type-Options: nosniff`, and custom rate limiting.  
  *Evidence:* `backend/middleware/auth.js`, `frontend/nginx.conf`, `scripts/check_build_serving.cjs`.

---

## 3. Services and Background Processes

- **API Server (`backend/server.js`)**: Serves REST endpoints (`/api/auth`, `/api/chat`, `/api/generate`, `/api/save`, `/api/history`, `/api/analytics`, `/api/health`, `/api/ready`) and WebSocket heartbeats.
- **Biomedical Literature Harvester (`backend/services/pubmedService.js`)**: Interfaces with NCBI Entrez E-Utilities (`esearch.fcgi`, `efetch.fcgi`) using XML flattening via `fast-xml-parser`.
- **Pharmacological Interaction Screener (`backend/services/interactionService.js`)**: 23 FDA Black-Box drug interaction rules with bidirectional regex matching.
- **Clinical Safety Engine (`backend/services/safetyService.js`)**: Real-time crisis triage (988 lifeline), self-harm diversion, and prompt-injection defense.
- **Multi-Provider AI Dispatcher (`backend/services/aiService.js`, `backend/services/modelProvider.js`)**: Dispatches queries to Gemini, Groq, Together AI, or local Ollama/vLLM endpoints with fallback modes.
- **Secondary Reviewer (`backend/services/answerVerifier.js`)**: Independent model review verifying claim entailment (`SUPPORTED` vs `UNSUPPORTED`).

---

## 4. Datastores and Storage

- **Primary Database**: MongoDB 7.0 via Mongoose 8.9.  
  *Evidence:* `backend/models/User.js`, `backend/models/Conversation.js`, `deploy/docker-compose.yml`, `deploy/mongo-init.js`.
- **Test In-Memory Database**: `mongodb-memory-server` 10.1 for zero-leakage, isolated integration tests.  
  *Evidence:* `backend/test/application.test.js`.
- **Client Storage**: Resilient `sessionStorage` with memory Map fallback (`tabStorage.js`) and Web Locks mutex (`navigator.locks`).  
  *Evidence:* `frontend/src/utils/tabStorage.js`, `frontend/src/lib/api.js`.
- **Cryptographic Key Vault**: AES-256-GCM hardware/software encryption for user-supplied provider API keys with rotating keysets.  
  *Evidence:* `backend/services/providerCredentials.js`.

---

## 5. External APIs and Model Providers

- **Google Gemini API**: Default production model (`gemini-1.5-flash` / `gemini-1.5-pro`).  
  *Evidence:* `backend/services/aiService.js`.
- **Groq Cloud API**: Ultra-low-latency Llama-3 inference.  
  *Evidence:* `backend/services/modelProvider.js`.
- **Together AI**: Open-source model endpoint.  
  *Evidence:* `backend/services/modelProvider.js`.
- **Local LLM Gateway**: OpenAI-compatible HTTP inference endpoint (Ollama / vLLM on `localhost:11434` or custom URL).  
  *Evidence:* `backend/services/modelProvider.js`.
- **NCBI Entrez E-Utilities**: Public biomedical literature search (`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`).  
  *Evidence:* `backend/services/pubmedService.js`.

---

## 6. Authentication and Session Governance

- **Token Strategy**: Dual-token architecture with 15-minute access JWTs and 7-day rotating refresh tokens.  
  *Evidence:* `backend/controllers/authController.js`, `backend/middleware/auth.js`.
- **Session Versioning**: Atomic monotonic `sessionVersion` counter in `User` model; logging in from a new device instantly invalidates previous sessions.  
  *Evidence:* `backend/models/User.js`, `backend/test/application.test.js`.
- **OAuth 2.0**: Optional Google Identity sign-in with cryptographic `state` validation and password isolation.  
  *Evidence:* `backend/controllers/authController.js`.

---

## 7. Deployment Targets

- **Docker Compose**: Multi-container stack (`deploy/docker-compose.yml`) orchestrating `backend`, `frontend` (Nginx), and `mongo`.
- **Bare-Metal / Staging**: Direct systemd or Node process execution behind an external TLS reverse proxy.
- **Production Host Ingress**: Nginx Alpine container providing SPA static routing, immutable asset caching, security headers, and reverse proxying to backend on `:5000`.  
  *Evidence:* `frontend/nginx.conf`, `deploy/docker-compose.yml`.

---

## 8. Test Tooling and Verification Harness

- **Backend Integration & Unit**: Node.js built-in test runner (`node:test`) with 77 tests across 10 test files.  
  *Evidence:* `backend/test/`.
- **Frontend Component & Accessibility**: Vitest 5.0 with jsdom and React Testing Library (61 tests across 6 files).  
  *Evidence:* `frontend/src/test/`.
- **Python Research Unit Suite**: Standard library `unittest` (19 tests across 6 files).  
  *Evidence:* `Model and Dataset/`, `Model and Dataset/lora/`.
- **Gateway & HTTP Probes**: `scripts/check_build_serving.cjs` (8 checks).
- **Headless Browser Workflows**: Playwright Chromium (63 automated workflows across smoke and accessibility suites).  
  *Evidence:* `scripts/browser_smoke.cjs`, `scripts/browser_verify_dark_and_tools.cjs`.
- **Master Runner**: Unified execution via `node scripts/verify_project.cjs` (228 automated checks).

---

## 9. Observability and Auditing

- **Analytics Dashboard**: User-scoped query volume, evidence retrieval rates, citation counts, and 30-day activity logs.  
  *Evidence:* `backend/controllers/analyticsController.js`, `frontend/src/components/dashboard/AnalyticsDashboard.jsx`.
- **Structured QA Logging**: Automated logs saved to `output/qa/*.log` and JSON metric exports (`output/qa/automated-results.json`).  
  *Evidence:* `scripts/verify_project.cjs`, `output/qa/README.md`.

---

**Evidence:** `package.json`, `backend/app.js`, `backend/services/interactionService.js`, `backend/services/pubmedService.js`, `frontend/src/components/tools/ClinicalCalculatorsModal.jsx`, `deploy/docker-compose.yml`, `scripts/verify_project.cjs`.
