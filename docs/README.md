# MedAssist AI — Technical Documentation Suite

Developed by **J Ganesh kumar reddy**  
*Full-Stack Educational Health Assistance, Biomedical Evidence Grounding, & Machine Learning Research Platform*

---

## 1. Executive Summary & Documentation Index

MedAssist AI is an educational health information application and biomedical AI research project. It combines PubMed retrieval with configurable Gemini, Groq, Together AI, or local model serving. The app has session controls, numeric citation checks, a limited medication-name caution list, educational calculators, and AES-256-GCM encryption for stored personal provider keys. None of these features establishes clinical accuracy or production readiness.

This comprehensive technical documentation suite provides deep engineering specifications, mathematical formulations, architectural diagrams, security invariants, and operational runbooks.

```
========================================================================================================================
                                     MEDASSIST AI — PRODUCTION DOCUMENTATION SUITE
========================================================================================================================
  [01] SYSTEM_ARCHITECTURE_DEEP_DIVE.md       ──► Multi-Tier Infrastructure, Ingress, & Network Flow
  [02] CURRENT_IMPLEMENTATION.md              ──► Complete Runtime State, API Specs, & Database Schemas
  [03] DEEP_DIVE_AI_WORKING_PRINCIPLES.md     ──► Biomedical RAG Math, PubMed E-Utilities, & Verifiers
  [04] DEEP_DIVE_LORA_AND_FINE_TUNING.md      ──► Parameter-Efficient LoRA Math & SFT Backprop Derivation
  [05] SECURITY_AND_MESSAGE_POLICY.md         ──► AES-256-GCM Vault, OWASP Defenses, & Safety Policies
  [06] COMPLETE_FILE_DIRECTORY_REFERENCE.md   ──► Comprehensive File-by-File Technical Code Catalog
  [07] DEPLOYMENT_RUNBOOK.md                  ──► Docker Compose, external TLS, & Ops Playbooks
  [08] EVALUATION_AND_INTEGRATION.md          ──► Paired Ablation Scoring & Local Document Retrieval
  [09] IMPLEMENTATION_STATUS.md               ──► Engineering Verification Matrix & Local Test Evidence
  [10] ISSUES_AND_RISKS.md                    ──► Prioritized Risk Register & Engineering Mitigations
  [11] AI_ARCHITECTURE_AND_WORKING_PRINCIPLES.md ─► Concise Grounding Summary & Algorithmic Rules
  [12] AI_FINE_TUNING_AND_LORA_GUIDE.md       ──► Concise LoRA Setup Guide & Parameter Benchmarks
  [13] COMPREHENSIVE_CODEBASE_ANALYSIS.md     ──► Line-by-Line Subsystem & File Implementation Deep Dive
========================================================================================================================
```

---

## 2. High-Level ASCII System Architecture

```
+==================================================================================================+
|                                    CLIENT TIER (Web Browser)                                     |
|  React 19 SPA | Vite 6 | Tailwind CSS 4 | Web Locks API | tabStorage (Resilient Session Recovery) |
|  11 Validated Clinical Calculators (BMI, eGFR, CHA2DS2-VASc, MAP, CrCl, Wells PE, Payne, etc.)    |
+==================================================================================================+
                                           │              ▲
               HTTP (Port 8080; external HTTPS required) │   WebSocket (/ws)
                       Strict SameSite     ▼              │   Owner-Scoped Realtime Sync
+==================================================================================================+
|                                  NETWORK & INGRESS TIER (Nginx)                                  |
|  - Static Asset Delivery (Cache-Control: immutable)  - Security Headers (CSP, HSTS, X-Frame)     |
|  - Reverse Proxy (/api/* -> backend:5000)            - WebSocket Upgrade Gateway (/ws)           |
|  - Ingress Healthcheck (/healthz -> 200 OK)                                                      |
+==================================================================================================+
                                           │              ▲
                               HTTP / WS   │              │   JSON Stream
                                           ▼              │
+==================================================================================================+
|                                APPLICATION SERVER TIER (Node.js 24)                              |
|  [Express Pipeline]                                                                              |
|    ├── Request Tracing (UUIDv4 x-request-id)   ├── CORS Whitelist & Origin Match Gate            |
|    ├── Body Parser (Strict 32KB Limit)        ├── Rate Limiters (Auth: 30/15m, AI: 20/m, Set: 12)|
|    └── Auth Middleware (JWT Cookie Validation & Monotonic sessionVersion Enforcement)             |
|                                                                                                  |
|  [Core Controllers & Services]                                                                   |
|    ├── authController.js     <--> sessionService.js (Rotating SHA-256 Refresh Tokens)            |
|    ├── oauthController.js    <--> PKCE S256 Flow & Google OpenID Connect Verification            |
|    ├── settingsController.js <--> providerCredentials.js (AES-256-GCM User API Key Vault)       |
|    ├── aiController.js       <--> answerService.js (Two-Phase Idempotent Generation)             |
|    ├── medicalController.js  <--> pubmedService.js (NCBI E-Utilities: esearch, esummary, efetch)  |
|    ├── citationService.js    <--> Deterministic Numerical Set Partitioning [N] Audit             |
|    ├── interactionService.js <--> Limited 12-pair medication-name caution checker              |
|    ├── answerVerifier.js     <--> Secondary LLM Draft Consensus Review                          |
|    └── websocketService.js   <--> 30s Heartbeat Watchdog & 1MB Backpressure Protection           |
+==================================================================================================+
         │                                 │                                │
         ▼                                 ▼                                ▼
+==================+             +===================+            +===================+
+ PERSISTENCE TIER |             | UPSTREAM MEDICAL  |            | UPSTREAM AI TIERS |
| MongoDB 7        |             | NCBI Entrez APIs  |            | Google Gemini API |
| - Users & Vault  |             | - esearch.fcgi    |            | Groq Cloud API    |
| - Chats & History|             | - esummary.fcgi   |            | Together AI API   |
| - Generations    |             | - efetch.fcgi     |            | Local OpenAI Host |
|   (24h TTL)      |             | (fast-xml-parser) |            | (vLLM / Ollama)   |
+==================+             +===================+            +===================+
```

---

## 3. Platform Capabilities Mindmap

The mindmap below outlines the full architectural hierarchy of the MedAssist AI platform:

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0284c7', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#0369a1', 'lineColor': '#0284c7', 'secondaryColor': '#0d9488', 'tertiaryColor': '#6366f1' }}}%%
mindmap
  root((MedAssist AI Platform))
    ::icon(fa fa-heartbeat)
    (01 Client Tier)
      React 19 SPA
      Vite 6 Fast Bundler
      Tailwind CSS 4
      Web Locks Single-Flight Refresh
      Resilient tabStorage Recovery
      IME Composition Guard
      11 Clinical Calculators
    (02 Ingress & Security)
      Nginx Reverse Proxy
      Origin Verification Gate
      Strict-Transport-Security
      X-Content-Type-Options nosniff
      X-Frame-Options DENY
      AES-256-GCM Personal Key Vault
      Monotonic sessionVersion Invalidation
      SHA-256 Token Rotation
    (03 Biomedical Grounding)
      NCBI Entrez REST Pipeline
        esearch Relevance Sorting
        esummary Bibliographic Extraction
        efetch MEDLINE XML Parsing
        fast-xml-parser Text Extraction
      Deterministic Citation Auditor
        Bracket Regex Extraction
        Valid vs Invalid Partitioning
        Reference Coverage Metric
      Secondary Consensus Verifier
        Independent Gemini Review
        Supported vs Unsupported
    (04 Pharmacological & Safety Filters)
      Deterministic Safety Screening
        Self-Harm & Crisis Deflection
        Acute Emergency Interception
        Harmful Synthesis Rejection
        Prompt Injection Token Stripping
      12 Medication-Name Pair Cautions
        Preserved in Emergency Redirects
    (05 Model Orchestration)
      Multi-Provider Engine
        Google Gemini 2.5 Flash
        Groq High-Throughput
        Together AI Inference
        Local OpenAI-Compatible vLLM
      Context Windowing
        Recent Turn Injection
        Prompt Injection Shield
        Style Directives
    (06 Real-Time & Persistence)
      Two-Phase Generation Handshake
        Phase 1 Ephemeral Generation 24h TTL
        Phase 2 Atomic Document Commitment
      WebSocket Gateway /ws
        Heartbeat Ping Pong 30s
        Backpressure Drop 1MB
        User-Scoped State Sync
      MongoDB 7 Schemas
        User Profile & Passwords
        Chat Threads & Messages
        Provider Credentials
    (07 Machine Learning & LoRA)
      Offline Data Hygiene
        Jaccard Divergence Audit
        Multi-Answer Quarantine
        Zero-Leakage Hash Splitting
      Parameter-Efficient Adaptation
        GPT-2 Low-Rank Bottleneck
        147,456 Trainable Params
        PyTorch Label Masking -100
        Review-Gated Training Gate
```

---

## 4. Master Documentation Catalog & Links

The comprehensive system documentation is organized into focused architectural volumes:

| Volume | File | Core Engineering Focus |
| :--- | :--- | :--- |
| **01** | **[`SYSTEM_ARCHITECTURE_DEEP_DIVE.md`](SYSTEM_ARCHITECTURE_DEEP_DIVE.md)** | Multi-tier network topology, Nginx ingress routing, Express middleware execution order, Web Locks token renewal, single-device session versioning state machine, two-phase generation commitment handshake, and `/ws` WebSocket architecture. |
| **02** | **[`CURRENT_IMPLEMENTATION.md`](CURRENT_IMPLEMENTATION.md)** | Comprehensive runtime specification, complete REST API endpoint schemas, request/response JSON contracts, Mongoose database models, index specifications, TTL rules, and deployment bounds. |
| **03** | **[`DEEP_DIVE_AI_WORKING_PRINCIPLES.md`](DEEP_DIVE_AI_WORKING_PRINCIPLES.md)** | Mathematical foundations of biomedical RAG, NCBI Entrez E-utilities three-stage protocol (`esearch`, `esummary`, `efetch`), XML parsing algorithms, prompt injection containment, multi-provider execution, citation audit mathematics, and consensus verifier logic. |
| **04** | **[`DEEP_DIVE_LORA_AND_FINE_TUNING.md`](DEEP_DIVE_LORA_AND_FINE_TUNING.md)** | Complete mathematical derivations of Low-Rank Adaptation (LoRA: $W = W_0 + \frac{\alpha}{r}BA$), gradient backpropagation through rank-$r$ bottlenecks, parameter estimation formulas ($147,456$ parameters), memory footprint proofs, label masking math, and multi-answer data quarantine algorithms. |
| **05** | **[`SECURITY_AND_MESSAGE_POLICY.md`](SECURITY_AND_MESSAGE_POLICY.md)** | Server trust boundaries, cryptographic AES-256-GCM user API key vault, single-device session invalidation, OWASP Top 10 mitigation matrix, CSRF/CORS origin verification, rate-limiting tiers, and input/output deterministic safety filters. |
| **06** | **[`COMPLETE_FILE_DIRECTORY_REFERENCE.md`](COMPLETE_FILE_DIRECTORY_REFERENCE.md)** | Exhaustive, line-by-line engineering inventory of every file in the repository across `backend/`, `frontend/`, `Model and Dataset/`, `scripts/`, and root configurations, including exported symbols, dependencies, and architectural roles. |
| **07** | **[`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md)** | Production operations manual, multi-container Docker Compose orchestration, bare-metal deployment, automated secrets generation (`deploy/create_env.cjs`), SSL/TLS Nginx configuration, database backup/restore (`mongodump`/`mongorestore`), health/readiness monitoring, and disaster recovery. |
| **08** | **[`EVALUATION_AND_INTEGRATION.md`](EVALUATION_AND_INTEGRATION.md)** | Empirical evaluation framework, paired case-level ablation scoring (`evaluate_benchmark.py`), offline document retrieval with OCR (`document_retrieval.py`), privacy boundaries, and clinical evidence caveats. |
| **09** | **[`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md)** | Local verification evidence across backend (64), frontend (43), Python (19), built HTTP (7), and separately run browser workflows (41). Production dependency audits reported zero vulnerabilities at the time of the run. |
| **10** | **[`ISSUES_AND_RISKS.md`](ISSUES_AND_RISKS.md)** | Prioritized risk register and engineering mitigations, multi-tier defense-in-depth model, clinical boundaries, pharmacological heuristic limitations, cryptographic key dependencies, and regulatory compliance. |
| **11** | **[`AI_ARCHITECTURE_AND_WORKING_PRINCIPLES.md`](AI_ARCHITECTURE_AND_WORKING_PRINCIPLES.md)** | Condensed architectural handbook summarizing the clinical query routing pipeline, PubMed grounding steps, Gemini system instructions, and citation validation rules. |
| **12** | **[`AI_FINE_TUNING_AND_LORA_GUIDE.md`](AI_FINE_TUNING_AND_LORA_GUIDE.md)** | Condensed PEFT guide covering LoRA parameter reduction, zero-leakage dataset partitioning, and review-gated training commands. |
| **13** | **[`COMPREHENSIVE_CODEBASE_ANALYSIS.md`](COMPREHENSIVE_CODEBASE_ANALYSIS.md)** | Exhaustive, file-by-file implementation deep dive with line-by-line subsystem analysis, real code snippets, ASCII topologies, and colorful architectural mindmaps. |

---

## 5. Subsystem Documentation Cross-References

Detailed subsystem-specific README files are located directly in their respective component directories:

- **Root Quickstart & Master Overview**: [`../README.md`](../README.md)
- **Backend Architecture & API Specifications**: [`../backend/README.md`](../backend/README.md)
- **Frontend Architecture & Client State**: [`../frontend/README.md`](../frontend/README.md)
- **Dataset Analysis, Auditing & Splits**: [`../Model and Dataset/README.md`](../Model%20and%20Dataset/README.md)
- **Offline LoRA Package & Parameter Estimation**: [`../Model and Dataset/lora/README.md`](../Model%20and%20Dataset/lora/README.md)
- **Engineering Improvement Plan & Milestones**: [`../IMPROVEMENT_PLAN.md`](../IMPROVEMENT_PLAN.md)
