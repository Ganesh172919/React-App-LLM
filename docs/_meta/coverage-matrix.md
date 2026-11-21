# Codebase Coverage Matrix

**Date:** 2026-11-08  
**Verification SHA:** `7f868d650e119c134a065722761cb9d13b80a76b`  

---

## 1. HTTP API Operations

| Surface / Method | Route Path | Implementation File | Primary Documentation | Verified Status |
|:---|:---|:---|:---|:---:|
| POST | `/api/auth/register` | `backend/controllers/authController.js` | `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| POST | `/api/auth/login` | `backend/controllers/authController.js` | `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| POST | `/api/auth/refresh` | `backend/controllers/authController.js` | `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| POST | `/api/auth/logout` | `backend/controllers/authController.js` | `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| POST | `/api/auth/forgot-password` | `backend/controllers/authController.js` | `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| POST | `/api/auth/reset-password` | `backend/controllers/authController.js` | `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| POST | `/api/auth/google` | `backend/controllers/authController.js` | `backend/routes/README.md`, `SECURITY_AND_MESSAGE_POLICY.md` | Covered |
| POST | `/api/chat` | `backend/controllers/chatController.js` | `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| POST | `/api/generate` | `backend/controllers/chatController.js` | `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| POST | `/api/save` | `backend/controllers/chatController.js` | `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| GET | `/api/history` | `backend/controllers/chatController.js` | `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| GET | `/api/history/:id` | `backend/controllers/chatController.js` | `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| PATCH | `/api/history/:id` | `backend/controllers/chatController.js` | `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| DELETE | `/api/history/:id` | `backend/controllers/chatController.js` | `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| GET | `/api/analytics` | `backend/controllers/analyticsController.js`| `backend/routes/README.md`, `CURRENT_IMPLEMENTATION.md` | Covered |
| GET | `/api/health` | `backend/server.js` | `DEPLOYMENT_RUNBOOK.md`, `PRODUCTION_DEVELOPER_BUILD_GUIDE.md` | Covered |
| GET | `/api/ready` | `backend/server.js` | `DEPLOYMENT_RUNBOOK.md`, `PRODUCTION_DEVELOPER_BUILD_GUIDE.md` | Covered |

---

## 2. Environment Variables & Secrets

| Variable Name | Component | Default / Expected | Secret? | Code Sourced | Documented Sourced |
|:---|:---|:---|:---:|:---|:---|
| `PORT` | Backend Express | `5000` | No | `backend/server.js` | `DEPLOYMENT_RUNBOOK.md` |
| `NODE_ENV` | Runtime Environment | `development` / `production` | No | `backend/server.js` | `DEPLOYMENT_RUNBOOK.md` |
| `MONGO_URI` / `MONGODB_URI` | Database Connection | `mongodb://127.0.0.1:27017/medassist` | No | `backend/server.js` | `DEPLOYMENT_RUNBOOK.md` |
| `CLIENT_ORIGIN` | CORS Whitelist | `http://127.0.0.1:5173,http://localhost:5173` | No | `backend/app.js` | `SECURITY_AND_MESSAGE_POLICY.md` |
| `COOKIE_SECURE` | HTTPS Session Cookie | `false` (dev), `true` (prod) | No | `backend/controllers/authController.js` | `SECURITY_AND_MESSAGE_POLICY.md` |
| `TRUST_PROXY` | Reverse Proxy Ingress | `false` or IP string | No | `backend/app.js` | `DEPLOYMENT_RUNBOOK.md` |
| `STRUCTURED_LOGS` | JSON Log Formatter | `false` (dev), `true` (prod) | No | `backend/app.js` | `DEPLOYMENT_RUNBOOK.md` |
| `JWT_ACCESS_TOKEN` | Auth Access Token Signing | (Random 32-byte hex) | Yes | `backend/controllers/authController.js` | `SECURITY_AND_MESSAGE_POLICY.md` |
| `JWT_REFRESH_TOKEN` | Refresh Token Signing | (Random 32-byte hex) | Yes | `backend/controllers/authController.js` | `SECURITY_AND_MESSAGE_POLICY.md` |
| `JWT_VERIFICATION_TOKEN` | Email Verification Token | (Random 32-byte hex) | Yes | `backend/controllers/authController.js` | `SECURITY_AND_MESSAGE_POLICY.md` |
| `JWT_RESET_TOKEN` | Password Reset Token | (Random 32-byte hex) | Yes | `backend/controllers/authController.js` | `SECURITY_AND_MESSAGE_POLICY.md` |
| `GEMINI_API_KEY` | Google Gemini API Key | Optional (per deployment/BYOK) | Yes | `backend/services/aiService.js` | `PRODUCTION_DEVELOPER_BUILD_GUIDE.md` |
| `GEMINI_MODEL` | Google Gemini Model | `gemini-2.5-flash` | No | `backend/services/providerSelection.js` | `docs/runbooks/llm-provider-outage-or-rate-limit.md` |
| `AI_PROVIDER` | Default AI Engine | `gemini` (groq/together/local) | No | `backend/services/providerSelection.js` | `docs/runbooks/llm-provider-outage-or-rate-limit.md` |
| `GROQ_API_KEY` | Groq Inference Key | Optional | Yes | `backend/services/modelProvider.js` | `docs/runbooks/llm-provider-outage-or-rate-limit.md` |
| `GROQ_MODEL` | Groq Model Name | `openai/gpt-oss-20b` | No | `backend/services/modelProvider.js` | `docs/runbooks/llm-provider-outage-or-rate-limit.md` |
| `TOGETHER_API_KEY` | Together AI Inference Key| Optional | Yes | `backend/services/modelProvider.js` | `docs/runbooks/llm-provider-outage-or-rate-limit.md` |
| `TOGETHER_MODEL` | Together Model Name | Optional | No | `backend/services/modelProvider.js` | `docs/runbooks/llm-provider-outage-or-rate-limit.md` |
| `OPENROUTER_API_KEY` | OpenRouter key | Optional | Yes | `backend/services/providerSelection.js` | `docs/reference/configuration.md` |
| `OPENROUTER_MODEL` | OpenRouter model slug | `openrouter/free` | No | `backend/services/providerSelection.js` | `docs/reference/configuration.md` |
| `XAI_API_KEY` | xAI key | Optional | Yes | `backend/services/providerSelection.js` | `docs/reference/configuration.md` |
| `XAI_MODEL` | xAI model ID | Optional | No | `backend/services/providerSelection.js` | `docs/reference/configuration.md` |
| `FIREWORKS_API_KEY` | Fireworks key | Optional | Yes | `backend/services/providerSelection.js` | `docs/reference/configuration.md` |
| `FIREWORKS_MODEL` | Fireworks model ID | Optional | No | `backend/services/providerSelection.js` | `docs/reference/configuration.md` |
| `LOCAL_AI_BASE_URL` | Self-Hosted Model URL | `http://127.0.0.1:8000/v1` | No | `backend/services/modelProvider.js` | `docs/runbooks/llm-provider-outage-or-rate-limit.md` |
| `LOCAL_AI_MODEL` | Self-Hosted Model Name | Optional | No | `backend/services/modelProvider.js` | `docs/runbooks/llm-provider-outage-or-rate-limit.md` |
| `LOCAL_AI_API_KEY` | Self-Hosted Auth Header | Optional | Yes | `backend/services/modelProvider.js` | `docs/runbooks/llm-provider-outage-or-rate-limit.md` |
| `USER_API_KEY_ENCRYPTION_KEY` | AES-256 Key Vault Master | 64 random hex characters | Yes | `backend/services/providerCredentials.js` | `SECURITY_AND_MESSAGE_POLICY.md` |
| `USER_API_KEY_ENCRYPTION_KEYS` | AES Key Rotation Ring | Optional named key list | Yes | `backend/services/providerCredentials.js` | `SECURITY_AND_MESSAGE_POLICY.md` |
| `USER_API_KEY_ENCRYPTION_KEY_VERSION` | Active Vault Version | `v1` / `v2` | No | `backend/services/providerCredentials.js` | `SECURITY_AND_MESSAGE_POLICY.md` |
| `GEMINI_VERIFY_ANSWERS` | Medical Draft Verification| `false` | No | `backend/services/answerService.js` | `DEEP_DIVE_AI_WORKING_PRINCIPLES.md` |
| `GOOGLE_CLIENT_ID` | OAuth2 Client ID | Optional | No | `backend/controllers/authController.js` | `SECURITY_AND_MESSAGE_POLICY.md` |
| `GOOGLE_CLIENT_SECRET` | OAuth2 Client Secret | Optional | Yes | `backend/controllers/authController.js` | `SECURITY_AND_MESSAGE_POLICY.md` |
| `GOOGLE_CALLBACK_URL` | OAuth2 Redirect URI | Optional | No | `backend/controllers/authController.js` | `SECURITY_AND_MESSAGE_POLICY.md` |
| `NCBI_API_KEY` | PubMed E-Utilities Key | Optional (unthrottled) | Yes | `backend/services/pubmedService.js` | `DEEP_DIVE_AI_WORKING_PRINCIPLES.md` |
| `BREVO_API_KEY` | Transactional Email Key | Optional | Yes | `backend/services/emailService.js` | `DEPLOYMENT_RUNBOOK.md` |
| `EMAIL_FROM_ADDRESS` | Outbound Email Address | `no-reply@example.com` | No | `backend/services/emailService.js` | `DEPLOYMENT_RUNBOOK.md` |
| `EMAIL_FROM_NAME` | Outbound Sender Name | `MedAssist AI` | No | `backend/services/emailService.js` | `DEPLOYMENT_RUNBOOK.md` |
| `DATASET_REPORT_DIR` | ML Dataset Audit Export | Optional directory path | No | `backend/services/datasetAudit.js` | `Model and Dataset/reports/README.md` |
| `VITE_API_URL` | Frontend API Base Endpoint| `/api` | No | `frontend/src/lib/api.js` | `frontend/README.md` |
| `VITE_WS_URL` | Frontend WebSocket Endpoint| Auto-derived from window.location | No | `frontend/src/lib/api.js` | `frontend/README.md` |

---

## 3. Clinical Calculator Suite (22 Tools)

| ID | Calculator Name | Validation Status | Documented Location |
|:---|:---|:---:|:---|
| `bmi` | Body Mass Index (Metric & Imperial) | Validated & Clamped | `frontend/src/components/tools/README.md` |
| `egfr` | eGFR CKD-EPI 2021 Race-Free | Validated & Clamped | `frontend/src/components/tools/README.md` |
| `chads` | $\text{CHA}_2\text{DS}_2\text{-VASc}$ Factor Count | Gated on 7 assessed inputs | `frontend/src/components/tools/README.md` |
| `map` | Mean Arterial Pressure (MAP) | Validated & Clamped | `frontend/src/components/tools/README.md` |
| `crcl` | Cockcroft-Gault Creatinine Clearance | Validated & Clamped | `frontend/src/components/tools/README.md` |
| `calcium` | Payne Corrected Calcium | Validated & Clamped | `frontend/src/components/tools/README.md` |
| `aniongap` | Serum Anion Gap | Validated & Clamped | `frontend/src/components/tools/README.md` |
| `fena` | Fractional Excretion of Sodium | Validated & Clamped | `frontend/src/components/tools/README.md` |
| `feurea` | Fractional Excretion of Urea | Validated & Clamped | `frontend/src/components/tools/README.md` |
| `fluids` | Maintenance Fluids (Holliday-Segar 4-2-1)| Validated & Clamped | `frontend/src/components/tools/README.md` |
| `wells` | Wells' Criteria for PE | Gated on 7 NICE criteria | `frontend/src/components/tools/README.md` |
| `curb65` | CURB-65 Pneumonia Severity | Gated on 5 assessed criteria | `frontend/src/components/tools/README.md` |
| `gcs` | Glasgow Coma Scale (GCS) | Gated on 3 observed responses (untestable supported) | `frontend/src/components/tools/README.md` |
| `hasbled`| HAS-BLED Bleeding Risk | Gated on 9 assessed factors (INR N/A supported) | `frontend/src/components/tools/README.md` |
| `qsofa` | qSOFA Sepsis Screening | Gated on 3 assessed criteria | `frontend/src/components/tools/README.md` |
| `bsa` | Mosteller Body Surface Area | Validated & Clamped | `frontend/src/components/tools/README.md` |
| `apri` | AST to Platelet Ratio Index (APRI) | Gated on 3 laboratory inputs | `frontend/src/components/tools/README.md` |
| `childpugh`| Child-Pugh Cirrhosis Classification | Gated on 5 complete findings | `frontend/src/components/tools/README.md` |
| `meld` | Historical 2016 MELD-Na Equation | Gated on complete inputs & dialysis; links OPTN | `frontend/src/components/tools/README.md` |
| `centor` | Modified Centor (McIsaac) Strep Score | Gated on 4 criteria & age group | `frontend/src/components/tools/README.md` |
| `heart` | HEART Score for Chest Pain MACE | Gated on 5 assessed categories | `frontend/src/components/tools/README.md` |
| `perc` | PERC Rule for PE Rule-Out | Gated on 8 exclusion criteria | `frontend/src/components/tools/README.md` |

---

## 4. High-Risk Drug Interaction Suite (23 Rules)

All 23 rules in `backend/services/interactionService.js` are documented in `backend/README.md` Section 4.7, `backend/services/README.md` Section 3.4, and verified in `backend/test/interactionService.test.js`.

---

**Evidence:** `backend/routes/`, `backend/services/interactionService.js`, `frontend/src/components/tools/ClinicalCalculatorsModal.jsx`, `deploy/docker-compose.yml`.
