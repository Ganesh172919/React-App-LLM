---
title: "Configuration Reference"
description: "Exhaustive environment variable reference for MedAssist AI backend and frontend runtime components"
quadrant: reference
audience: [operator, developer]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["backend/.env.example", "frontend/.env.example", "backend/server.js", "backend/app.js"]
---

# Configuration Reference

This page documents all environment variables used by MedAssist AI across the Node.js API runtime, frontend build system, and worker utilities.

---

## 1. Core Server & Ingress Configuration

| Variable | Type | Default | Required | Secret? | Sourced In | Description & Valid Values |
|:---|:---:|:---:|:---:|:---:|:---|:---|
| `PORT` | Integer | `5000` | No | No | `backend/server.js` | HTTP listen port for Express application server. |
| `NODE_ENV` | String | `development` | No | No | `backend/server.js` | Node runtime mode (`development` or `production`). |
| `MONGO_URI` | URI | `mongodb://127.0.0.1:27017/medassist` | Yes | No | `backend/server.js` | Standard MongoDB connection URI (e.g. `mongodb://host:port/dbname` or SRV string). |
| `MONGO_ROOT_PASSWORD` | String | (None) | In Docker | Yes | `.env.docker.example` | Root password used by containerized MongoDB initialization. |
| `MONGO_APP_PASSWORD` | String | (None) | In Docker | Yes | `deploy/mongo-init.js` | Application user password for authenticated MongoDB access. |
| `CLIENT_ORIGIN` | CSV String | `http://127.0.0.1:5173,http://localhost:5173` | Yes | No | `backend/app.js` | Comma-separated CORS allowed origin URLs for browser clients. |
| `PUBLIC_ORIGIN` | URL | `http://localhost:8080` | In Docker | No | `.env.docker.example` | Public ingress origin used by Docker Compose reverse proxy. |
| `COOKIE_SECURE` | Boolean | `false` | No | No | `backend/controllers/authController.js` | Sets `Secure` flag on HTTP-only session cookies. Must be `true` in production HTTPS. |
| `TRUST_PROXY` | String / Bool | `false` | No | No | `backend/app.js` | Configures Express `trust proxy` setting for Nginx / AWS ALB ingress IP extraction. |
| `STRUCTURED_LOGS` | Boolean | `false` | No | No | `backend/app.js` | Enables JSON-formatted structured logging with correlation IDs on stdout. |

---

## 2. Authentication & Cryptography Secrets

| Variable | Type | Default | Required | Secret? | Sourced In | Description & Valid Values |
|:---|:---:|:---:|:---:|:---:|:---|:---|
| `JWT_ACCESS_TOKEN` | Hex String | (None) | Yes | Yes | `backend/controllers/authController.js` | 256-bit random hex secret used to sign short-lived access JWTs. |
| `JWT_REFRESH_TOKEN` | Hex String | (None) | Yes | Yes | `backend/controllers/authController.js` | 256-bit random hex secret used to sign rotating refresh tokens. |
| `JWT_VERIFICATION_TOKEN` | Hex String | (None) | Yes | Yes | `backend/controllers/authController.js` | 256-bit random hex secret for email verification links. |
| `JWT_RESET_TOKEN` | Hex String | (None) | Yes | Yes | `backend/controllers/authController.js` | 256-bit random hex secret for password reset tokens. |
| `USER_API_KEY_ENCRYPTION_KEY` | 64-Hex | (None) | Yes (BYOK) | Yes | `backend/services/providerCredentials.js` | 32-byte (64 hex character) master AES-256-GCM vault encryption key for personal user API keys. |
| `USER_API_KEY_ENCRYPTION_KEYS` | CSV String | (None) | No | Yes | `backend/services/providerCredentials.js` | Key rotation ring syntax: `v2:<hex>,legacy:<hex>`. Retains legacy keys during vault re-encryption. |
| `USER_API_KEY_ENCRYPTION_KEY_VERSION` | String | `v1` | No | No | `backend/services/providerCredentials.js` | Active encryption key version label in key vault (`v1`, `v2`, etc.). |

---

## 3. Generative AI Providers & Inference Configuration

| Variable | Type | Default | Required | Secret? | Sourced In | Description & Valid Values |
|:---|:---:|:---:|:---:|:---:|:---|:---|
| `AI_PROVIDER` | Enum | `gemini` | No | No | `backend/services/providerSelection.js` | Default generation provider: `gemini`, `groq`, `together`, or `local`. |
| `GEMINI_API_KEY` | String | (None) | If Gemini | Yes | `backend/services/aiService.js` | Google Gemini API key obtained from Google AI Studio / GCP. |
| `GEMINI_MODEL` | String | `gemini-2.5-flash` | No | No | `backend/services/providerSelection.js` | Default Google Gemini model name (`gemini-2.5-flash`, `gemini-1.5-pro`). |
| `GEMINI_VERIFY_ANSWERS` | Boolean | `false` | No | No | `backend/services/answerService.js` | Optional secondary Gemini call checking medical drafts against supplied abstracts. |
| `GROQ_API_KEY` | String | (None) | If Groq | Yes | `backend/services/modelProvider.js` | Groq cloud inference API key (`gsk_...`). |
| `GROQ_MODEL` | String | `openai/gpt-oss-20b` | No | No | `backend/services/modelProvider.js` | Groq hosted LLM model identifier. |
| `TOGETHER_API_KEY` | String | (None) | If Together | Yes | `backend/services/modelProvider.js` | Together AI API key for open-source model inference. |
| `TOGETHER_MODEL` | String | (None) | If Together | No | `backend/services/modelProvider.js` | Together AI model string (e.g. `meta-llama/Llama-3-70b-chat-hf`). |
| `LOCAL_AI_BASE_URL` | URL | `http://127.0.0.1:8000/v1` | If Local | No | `backend/services/modelProvider.js` | Self-hosted OpenAI-compatible endpoint URL (vLLM, Ollama, llama.cpp). |
| `LOCAL_AI_MODEL` | String | (None) | If Local | No | `backend/services/modelProvider.js` | Identifier of local model served at `LOCAL_AI_BASE_URL`. |
| `LOCAL_AI_API_KEY` | String | (None) | No | Yes | `backend/services/modelProvider.js` | Optional Bearer authorization token for local model endpoint. |

---

## 4. Biomedical Retrieval & External Services

| Variable | Type | Default | Required | Secret? | Sourced In | Description & Valid Values |
|:---|:---:|:---:|:---:|:---:|:---|:---|
| `NCBI_API_KEY` | String | (None) | No | Yes | `backend/services/pubmedService.js` | NCBI E-Utilities API key. Increases rate limit from 3 req/sec to 10 req/sec. |
| `BREVO_API_KEY` | String | (None) | If Email | Yes | `backend/services/emailService.js` | Brevo (Sendinblue) API key for transactional emails. |
| `FRONTEND_URL` | URL | `http://localhost:5173` | No | No | `backend/services/emailService.js` | Base web application URL included in verification and reset email links. |
| `EMAIL_FROM_ADDRESS` | Email | `no-reply@example.com` | No | No | `backend/services/emailService.js` | Verified sender email address for outgoing emails. |
| `EMAIL_FROM_NAME` | String | `MedAssist AI` | No | No | `backend/services/emailService.js` | Sender display name for emails. |
| `GOOGLE_CLIENT_ID` | String | (None) | If OAuth | No | `backend/controllers/authController.js` | Google OAuth 2.0 Web Client ID. |
| `GOOGLE_CLIENT_SECRET` | String | (None) | If OAuth | Yes | `backend/controllers/authController.js` | Google OAuth 2.0 Client Secret. |
| `GOOGLE_CALLBACK_URL` | URL | (None) | If OAuth | No | `backend/controllers/authController.js` | Full redirect URI registered in Google Cloud Console. |
| `DATASET_REPORT_DIR` | Path | (None) | No | No | `backend/services/datasetAudit.js` | Directory path where ML dataset audit reports are exported. |

---

## 5. Frontend Client Build Environment

| Variable | Type | Default | Required | Sourced In | Description |
|:---|:---:|:---:|:---:|:---|:---|
| `VITE_API_URL` | String | `/api` | No | `frontend/src/lib/api.js` | Base URL path or remote origin for backend API requests. |
| `VITE_WS_URL` | WebSocket URL | Auto-derived | No | `frontend/src/lib/api.js` | WebSocket connection URL (e.g. `wss://example.com/ws`). |

---

**Evidence:** `backend/.env.example`, `frontend/.env.example`, `backend/services/providerCredentials.js`, `backend/services/modelProvider.js`, `backend/services/pubmedService.js`.
