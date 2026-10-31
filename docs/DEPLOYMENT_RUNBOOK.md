# MedAssist AI — Enterprise Operations & Deployment Runbook

Developed by **J Ganesh kumar reddy**  
*Full-Stack Educational Health Assistance, Biomedical Evidence Grounding, & Machine Learning Research Platform*

---

## 1. Executive Operations Summary & Production Topology

MedAssist AI operates as a containerized multi-tier distributed architecture comprising an edge ingress reverse proxy, a stateless Node.js application runtime, a persistent MongoDB database replica, and outbound TLS 1.3 integrations to biomedical knowledgebases and generative inference engines.

> [!CAUTION]
> **Clinical & Legal Notice**: MedAssist AI is an educational health information platform. Deterministic source grounding and heuristic safeguards do not establish clinical efficacy, diagnostic validity, or production medical device status. Review privacy regulations (HIPAA, GDPR), retention rules, and clinical use requirements before processing real patient or institutional data.

```
========================================================================================================================
                                     MEDASSIST AI — PRODUCTION NETWORK & INGRESS TOPOLOGY
========================================================================================================================

    [ PUBLIC CLIENTS / BROWSERS ]
                 │
                 │ Public TLS 1.3 (HTTPS :443) / Secure WebSockets (WSS :443)
                 │ Strict HSTS (31536000s), TLS_AES_256_GCM_SHA384
                 ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                EXTERNAL ENTERPRISE EDGE / INGRESS GATEWAY                                      │
    │  - Cloudflare / AWS ALB / Host Nginx Gateway with Valid CA Certificate (Let's Encrypt / DigiCert)              │
    │  - Web Application Firewall (WAF) & Layer 7 DDoS Mitigation                                                    │
    │  - HTTP-to-HTTPS Redirection & TLS Termination                                                                 │
    │  - Upstream Proxy Pass to Container Ingress (HTTP :8080)                                                       │
    └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                       │
                                                       │ Internal Cleartext HTTP (Loopback / Private VPC :8080)
                                                       ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                TIER 1: DOCKER INGRESS GATEWAY (Nginx:Alpine)                                   │
    │  - Container: medassist-frontend | Port: 80 (Published to Host: 8080)                                          │
    │  - Static Asset Delivery: /assets/* with Cache-Control: "public, max-age=31536000, immutable"                  │
    │  - Security Response Headers: X-Frame-Options DENY, nosniff, Referrer-Policy, CSP, Permissions-Policy          │
    │  - Reverse Proxy Routing:                                                                                      │
    │      ├── /api/*  ──► proxy_pass http://backend:5000                                                            │
    │      ├── /ws     ──► proxy_pass http://backend:5000 (HTTP/1.1 Upgrade + Connection: "upgrade")                │
    │      └── /healthz ──► return 200 "healthy\n" (Ingress Watchdog Liveness Probe)                                │
    └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                       │
                                                       │ Docker Internal Bridge Network (172.28.0.0/16)
                                                       ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                TIER 2: APPLICATION RUNTIME (Node.js 24 LTS)                                    │
    │  - Container: medassist-backend | Port: 5000 (Non-Published / Internal Mesh Only)                              │
    │  - Process Model: Node.js 24 Express 4 Single-Process Event Loop with Graceful SIGTERM Trapping               │
    │  - Identity & Security Pipeline:                                                                               │
    │      ├── Request Tracing: UUIDv4 x-request-id Injection & Structured JSON Access Logs                          │
    │      ├── CORS Gate: Origin Whitelist Verification & Sec-Fetch-Site Cross-Site Rejection                        │
    │      ├── Tiered Rate Limiters: Auth (30/15m), Settings (12/15m), AI/Medical (20/1m)                            │
    │      ├── Session Engine: Single-Device Monotonic sessionVersion with Instant Concurrent Invalidation           │
    │      ├── Token State Machine: Rotating SHA-256 Hashed Refresh Tokens in HttpOnly Cookies                       │
    │      └── AES-256-GCM Key Vault: Hardware-grade Authenticated Encryption for Personal Provider Keys            │
    │  - Real-time Gateway: WebSocket /ws Engine with 30s Heartbeat Watchdog & 1MB Backpressure Drop                 │
    └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                     │                                                               │
                     │ MongoDB Wire Protocol (Port 27017)                            │ Outbound HTTPS (Port 443)
                     ▼                                                               ▼
    ┌─────────────────────────────────────────────────┐             ┌────────────────────────────────────────────────┐
    │         TIER 3: PERSISTENT DATABASE             │             │           TIER 4: UPSTREAM SERVICES            │
    │  - Container: medassist-mongo | Port: 27017     │             │  - NCBI Entrez E-Utilities (esearch/summary)   │
    │  - Engine: MongoDB 7.0 Jammy Enterprise         │             │  - Google Gemini 2.5 Flash API                 │
    │  - Volume: medassist-mongo-data (/data/db)      │             │  - Groq Cloud LLM Inference Engine             │
    │  - Collections: users, chats, generations,      │             │  - Together AI Cloud Platform                  │
    │    providercredentials                          │             │  - Brevo Transactional Email Service           │
    │  - 24-Hour Automated TTL Purge on Generations   │             │  - Google OpenID Connect OAuth Provider        │
    └─────────────────────────────────────────────────┘             └────────────────────────────────────────────────┘
========================================================================================================================
```

---

## 2. Enterprise Operations & Lifecycle Mindmap

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0284c7', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#0369a1', 'lineColor': '#0284c7', 'secondaryColor': '#0d9488', 'tertiaryColor': '#6366f1' }}}%%
mindmap
  root((MedAssist Operations))
    ::icon(fa fa-cogs)
    (01 Provisioning & Secrets)
      deploy/create_env.cjs
        Independent 32-Byte Hex Secrets
        JWT Access & Refresh Keys
        AES-256-GCM Key Vault Seed
        Strict Refusal to Overwrite Existing
      Root .env Isolation
        Excluded from Frontend Bundle
        Isolated Docker Compose Environment
    (02 Container Ingress)
      Nginx Alpine Edge
        Static Immutable Caching 1 Year
        Security Headers CSP DENY nosniff
        Reverse Proxy /api to Port 5000
        WebSocket Upgrade Gateway /ws
        Liveness Healthcheck /healthz
      External HTTPS Termination
        Let's Encrypt Certbot Automation
        Strict-Transport-Security HSTS
    (03 Health & Monitoring)
      Multi-Level Probes
        Ingress Liveness /healthz
        Application Info /api/health
        Subsystem Readiness /api/ready
      Structured JSON Telemetry
        UUIDv4 Request Correlation
        Latency in Milliseconds
        MongoDB Connection State
    (04 Resilience & Recovery)
      Database Lifecycle
        Daily Automated mongodump
        Gzip Compressed Archive Volumes
        Point-in-Time Restore Verification
      Graceful Drain
        SIGTERM & SIGINT Trapping
        WebSocket Disconnect Code 1001
        10-Second Mongoose Disconnect Deadline
    (05 Cryptographic Security)
      Vault Key Lifecycle
        USER_API_KEY_ENCRYPTION_KEY
        Mandatory Cold Storage Vault
        Zero Key Exposure in Logs
      Data Purge Controls
        24-Hour Generation TTL Index
        Account Deletion Cascades
        Client-Triggered History Wipe
```

---

## 3. Production Environment Configuration Matrix

The deployment requires an isolated `.env` file at the repository root. Generate this file automatically using the provisioning script or populate it manually with distinct, high-entropy secrets.

### 3.1 Secrets Generation Utility

Execute the automated initialization script to generate cryptographically strong random secrets:

```powershell
# Execute from repository root
node deploy/create_env.cjs
```

The script verifies that `.env` does not already exist, provisions 32-byte cryptographically secure random hex strings using `crypto.randomBytes(32).toString("hex")`, and writes the production configuration template.

```javascript
// Implementation snippet from deploy/create_env.cjs:
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  console.error("ERROR: .env already exists. Refusing to overwrite existing deployment secrets.");
  process.exit(1);
}

const randomHex = () => crypto.randomBytes(32).toString("hex");

const envContent = [
  "# Auto-generated production deployment secrets",
  `NODE_ENV=production`,
  `MONGO_URI=mongodb://medassist_user:${randomHex()}@mongo:27017/medassist_prod?authSource=admin`,
  `JWT_ACCESS_SECRET=${randomHex()}`,
  `JWT_REFRESH_SECRET=${randomHex()}`,
  `USER_API_KEY_ENCRYPTION_KEY=${randomHex()}`,
  `CLIENT_ORIGIN=https://medassist.example.com`,
  `PUBLIC_ORIGIN=https://medassist.example.com`,
  `COOKIE_SECURE=true`,
  `TRUST_PROXY=loopback,linklocal,uniquelocal`,
  `STRUCTURED_LOGS=true`
].join("\n") + "\n";

fs.writeFileSync(envPath, envContent, { mode: 0o600 });
console.log("SUCCESS: Created production .env with secure random cryptographic keys.");
```

### 3.2 Master Environment Variables Reference

| Variable Name | Type | Sensitivity | Default / Requirement | Description & Operational Impact |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | String | Low | `production` | Enables Express production optimizations, strict cookie flags, and suppresses stack traces in API errors. |
| `PORT` | Integer | Low | `5000` | Internal TCP listening port for the Express application server. |
| `CLIENT_ORIGIN` | URL List | Medium | **Required** | Comma-delimited list of authorized browser origins (e.g. `https://medassist.yourdomain.com`). Enforces CORS and Origin headers. |
| `PUBLIC_ORIGIN` | URL | Medium | **Required** | Canonical public-facing HTTPS origin used for email verification links and OAuth callbacks. |
| `COOKIE_SECURE` | Boolean | Medium | `true` in Prod | When `true`, sets `Secure` attribute on JWT access and refresh cookies, preventing transmission over plain HTTP. |
| `TRUST_PROXY` | String | Medium | `loopback` | Configures Express `trust proxy` setting for proper client IP resolution behind reverse proxies and load balancers. |
| `MONGO_URI` | URI | **High** | **Required** | MongoDB connection string including credentials, port, target database, and replica set options. |
| `JWT_ACCESS_SECRET` | 64-char Hex | **Critical** | **Required** | 32-byte cryptographic secret for signing short-lived (15-minute) HS256 access JWTs. |
| `JWT_REFRESH_SECRET` | 64-char Hex | **Critical** | **Required** | 32-byte cryptographic secret for signing long-lived (7-day) HS256 refresh JWTs. |
| `USER_API_KEY_ENCRYPTION_KEY` | 64-char Hex | **Critical** | **Required** | 32-byte symmetric master key for AES-256-GCM authenticated encryption of user provider keys. |
| `STRUCTURED_LOGS` | Boolean | Low | `true` | When `true`, emits single-line JSON log events to stdout with `requestId`, `status`, and `durationMs`. |
| `BREVO_API_KEY` | String | **High** | Optional | API key for Brevo transactional email delivery (account verification, password reset tokens). |
| `EMAIL_FROM_ADDRESS` | Email | Low | Optional | Verified sender address for transactional system notifications (e.g. `noreply@medassist.yourdomain.com`). |
| `EMAIL_FROM_NAME` | String | Low | `MedAssist AI` | Display name for transactional system emails. |
| `NCBI_API_KEY` | String | Medium | Optional | Elevates NCBI Entrez E-Utilities rate limits from 3 requests/sec to 10 requests/sec. |
| `AI_PROVIDER` | Enum | Low | `gemini` | Default operator model backend: `gemini`, `groq`, `together`, or `local`. |
| `GEMINI_API_KEY` | String | **High** | Optional | API key for Google Gemini Generative Language API. Required if `AI_PROVIDER=gemini`. |
| `GEMINI_MODEL` | String | Low | `gemini-3.8-flash` | Target Gemini model identifier. |
| `GEMINI_VERIFY_ANSWERS`| Boolean | Low | `false` | Enables secondary independent Gemini LLM review of generated clinical claims. |
| `GROQ_API_KEY` | String | **High** | Optional | API key for Groq Cloud high-throughput inference platform. |
| `GROQ_MODEL` | String | Low | `openai/gpt-oss-20b`| Target Groq model identifier. |
| `TOGETHER_API_KEY` | String | **High** | Optional | API key for Together AI inference service. |
| `TOGETHER_MODEL` | String | Low | Optional | Target Together AI model identifier. |
| `LOCAL_AI_BASE_URL` | URL | Medium | Optional | OpenAI-compatible endpoint URL for local private inference (e.g. `http://vllm:8000/v1`). |
| `LOCAL_AI_MODEL` | String | Low | Optional | Model identifier deployed on local private inference host. |
| `GOOGLE_CLIENT_ID` | String | Medium | Optional | Google OAuth 2.0 Client ID for OpenID Connect sign-in. |
| `GOOGLE_CLIENT_SECRET`| String | **High** | Optional | Google OAuth 2.0 Client Secret. |
| `GOOGLE_CALLBACK_URL` | URL | Medium | Optional | Registered Google OAuth redirect URI (`https://medassist.yourdomain.com/api/auth/google/callback`). |

---

## 4. Multi-Container Orchestration (`docker-compose.yml`)

The platform is orchestrated via Docker Compose with dedicated subnets, healthcheck probes, and isolated resource constraints.

### 4.1 Compose Architecture & Dependency Graph

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0284c7', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#0369a1', 'lineColor': '#0284c7', 'secondaryColor': '#0d9488', 'tertiaryColor': '#6366f1' }}}%%
flowchart TD
    subgraph Host ["Physical Host / Cloud VM"]
        Port8080["External Port :8080"]
    end

    subgraph DockerBridge ["Docker Bridge Subnet (medassist-net)"]
        subgraph FrontendContainer ["medassist-frontend (nginx:alpine)"]
            Nginx["Nginx Reverse Proxy"]
            StaticFiles["Vite Dist HTML/JS/CSS"]
            HealthZ["/healthz Endpoint"]
        end

        subgraph BackendContainer ["medassist-backend (node:24-alpine)"]
            Express["Express 4 API Server (:5000)"]
            WSS["WebSocket Engine (/ws)"]
            HealthAPI["/api/health & /api/ready"]
        end

        subgraph MongoContainer ["medassist-mongo (mongo:7.0-jammy)"]
            MongoEngine["MongoDB 7.0 Engine (:27017)"]
            MongoInit["mongo-init.js"]
            MongoVol[("medassist-mongo-data Volume")]
        end
    end

    Port8080 -->|TCP Bind| Nginx
    Nginx -->|Proxy Pass /api/*| Express
    Nginx -->|Upgrade /ws| WSS
    Nginx -->|Serve /*| StaticFiles
    Express -->|Mongoose ODM| MongoEngine
    MongoEngine -->|Persist| MongoVol

    MongoContainer -.->|Condition: service_healthy| BackendContainer
    BackendContainer -.->|Condition: service_healthy| FrontendContainer
```

### 4.2 Docker Compose Production Specification

```yaml
version: "3.8"

networks:
  medassist-net:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.28.0.0/16

volumes:
  medassist-mongo-data:
    name: medassist-mongo-data
    driver: local

services:
  mongo:
    image: mongo:7.0-jammy
    container_name: medassist-mongo
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: medassist_prod
    volumes:
      - medassist-mongo-data:/data/db
      - ./deploy/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - medassist-net
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')", "--quiet"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: medassist-backend
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - PORT=5000
    depends_on:
      mongo:
        condition: service_healthy
    networks:
      - medassist-net
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:5000/api/ready"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: medassist-frontend
    restart: unless-stopped
    ports:
      - "8080:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - medassist-net
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/healthz"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 5s
```

---

## 5. Host Nginx Ingress & TLS 1.3 Configuration

The containerized Nginx instance listens on HTTP port 80 behind published host port 8080. Production environments require a host-level or cloud load balancer terminating TLS 1.3 with a valid certificate and enforcing strict security headers.

### 5.1 Host Nginx Reverse Proxy Configuration Template

Install this configuration on the production host (e.g. `/etc/nginx/sites-available/medassist.conf`):

```nginx
# Upstream definition pointing to Docker Compose published port
upstream medassist_docker {
    server 127.0.0.1:8080 fail_timeout=10s max_fails=3;
    keepalive 32;
}

# HTTP to HTTPS automatic redirection
server {
    listen 80;
    listen [::]:80;
    server_name medassist.yourdomain.com;

    # Let's Encrypt ACME challenge path
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# Master HTTPS Production Ingress
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name medassist.yourdomain.com;

    # TLS Certificates (Certbot / Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/medassist.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/medassist.yourdomain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/medassist.yourdomain.com/chain.pem;

    # Modern TLS Security Parameters (Mozilla Modern Standard)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Enterprise Strict Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' wss: https:;" always;

    # Payload Size Limits
    client_max_body_size 64k;

    # WebSocket Upgrade & REST Reverse Proxy Pass
    location / {
        proxy_pass http://medassist_docker;
        proxy_http_version 1.1;

        # WebSocket header upgrades
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Client Identity & Protocol Forwarding
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Port 443;

        # Buffering & Timeouts
        proxy_buffering off;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        proxy_connect_timeout 10s;
    }
}
```

---

## 6. Health Probes & Monitoring Architecture

MedAssist AI implements tiered health probes allowing orchestrators (Kubernetes, Docker Swarm, AWS ECS) and synthetic monitors to distinguish between ingress availability, process vitality, and subsystem dependency readiness.

```
========================================================================================================================
                                     HEALTH PROBE SPECIFICATION & RESPONSE CODES
========================================================================================================================

    [ PROBE URL ]          [ LAYER ]           [ DEPENDENCY CHECK ]              [ TYPICAL RESPONSE ]
    ─────────────────────────────────────────────────────────────────────────────────────────────────
    /healthz               Ingress (Nginx)     None (Nginx process running)       200 OK "healthy\n"
    /api/health            Backend Express     Process event loop responsive      200 OK {"status":"ok","version":"1.0.0"}
    /api/ready             Backend Express     MongoDB Connection State (readyState === 1)
                                               AI & Email Configuration           200 OK {"status":"ready",
                                                                                          "database":"connected",
                                                                                          "aiConfigured":true,
                                                                                          "emailConfigured":true}
                                                                                  503 Service Unavailable (if DB down)
========================================================================================================================
```

### 6.1 Readiness Verification Implementation

```javascript
// Implementation snippet from backend/app.js:
app.get("/api/ready", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "unavailable",
    database: ready ? "connected" : "disconnected",
    aiConfigured: require("./services/modelProvider").providerConfigured(),
    emailConfigured: Boolean(process.env.BREVO_API_KEY),
    requestId: req.requestId,
  });
});
```

Execute probe checks via CLI:

```powershell
# Ingress Liveness Probe
curl -i http://localhost:8080/healthz

# Application Vitality Probe
curl -i http://localhost:8080/api/health

# Comprehensive Subsystem Readiness Probe
curl -i http://localhost:8080/api/ready
```

---

## 7. Graceful Shutdown & Process Lifecycle

MedAssist AI traps `SIGTERM` and `SIGINT` signals to perform a non-destructive shutdown sequence, disconnecting WebSocket clients cleanly, releasing Mongoose connections, and stopping the HTTP listener within an enforced 10-second deadline.

```
========================================================================================================================
                                    GRACEFUL SHUTDOWN STATE MACHINE (SIGTERM / SIGINT)
========================================================================================================================

    [ SIGTERM Signal Received ]
                 │
                 ▼
    1. Mark closing flag = true (Reject new incoming socket upgrades)
                 │
                 ▼
    2. Broadcast WebSocket Close: for (const ws of wss.clients) ws.close(1001, "Server restarting");
                 │
                 ▼
    3. Arm Hard-Kill Watchdog Timer: setTimeout(() => process.exit(1), 10000).unref();
                 │
                 ▼
    4. Close WebSocket Server: wss.close()
                 │
                 ▼
    5. Close HTTP Server Listener: server.close() (Stop accepting new HTTP connections)
                 │
                 ▼
    6. Disconnect MongoDB: await mongoose.disconnect()
                 │
                 ▼
    7. Clear Watchdog Timer & Exit: clearTimeout(deadline); process.exit(0);
========================================================================================================================
```

### 7.1 Shutdown Implementation Code

```javascript
// Implementation snippet from backend/server.js:
let closing = false;
const shutdown = () => {
  if (closing) return;
  closing = true;
  console.log("Initiating graceful shutdown sequence...");

  // Send WebSocket close code 1001 (Going Away) to all active sessions
  for (const socket of wss.clients) {
    socket.close(1001, "Server restarting");
  }

  // 10-second safety deadline to prevent hung processes
  const deadline = setTimeout(() => {
    console.error("Graceful shutdown timed out after 10s. Forcing exit.");
    process.exit(1);
  }, 10000).unref();

  wss.close(() => {
    server.close(async () => {
      try {
        await mongoose.disconnect();
        console.log("MongoDB disconnected cleanly.");
      } catch (err) {
        console.error("Error during MongoDB disconnection:", err.message);
      }
      clearTimeout(deadline);
      console.log("MedAssist API process terminated gracefully.");
      process.exit(0);
    });
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

---

## 8. Backup, Restoration & Disaster Recovery Playbooks

MongoDB houses user identity records, salted password hashes, conversation threads, and AES-256-GCM encrypted provider credentials. Standard operating procedures require daily encrypted dumps, isolated key storage, and scheduled restore testing.

### 8.1 Automated Database Backup (`mongodump`)

Execute automated hot backups from the host system or via scheduled cron job:

```bash
#!/usr/bin/env bash
# /opt/medassist/scripts/backup_database.sh
set -euo pipefail

BACKUP_DIR="/var/backups/medassist/mongo"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TARGET_FILE="${BACKUP_DIR}/medassist_dump_${TIMESTAMP}.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting MongoDB backup..."
docker exec medassist-mongo mongodump \
  --username admin \
  --password "${MONGO_ROOT_PASSWORD}" \
  --authenticationDatabase admin \
  --db medassist_prod \
  --archive \
  --gzip > "${TARGET_FILE}"

chmod 600 "${TARGET_FILE}"
echo "[$(date)] Backup completed successfully: ${TARGET_FILE} ($(du -h ${TARGET_FILE} | cut -f1))"

# Retention policy: Delete backups older than 30 days
find "${BACKUP_DIR}" -type f -name "medassist_dump_*.gz" -mtime +30 -delete
```

### 8.2 Database Restoration (`mongorestore`)

To restore database state from an archived gzip backup into a recovery instance:

```bash
#!/usr/bin/env bash
# /opt/medassist/scripts/restore_database.sh
set -euo pipefail

BACKUP_FILE="${1:-}"
if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "Usage: $0 /path/to/medassist_dump_YYYYMMDD_HHMMSS.gz"
  exit 1
fi

echo "WARNING: Restoring will overwrite existing data in medassist_prod!"
read -p "Type 'CONFIRM' to proceed: " CONFIRM
if [ "${CONFIRM}" != "CONFIRM" ]; then
  echo "Restore aborted."
  exit 0
fi

docker exec -i medassist-mongo mongorestore \
  --username admin \
  --password "${MONGO_ROOT_PASSWORD}" \
  --authenticationDatabase admin \
  --db medassist_prod \
  --drop \
  --archive \
  --gzip < "${BACKUP_FILE}"

echo "Database restoration completed successfully."
```

### 8.3 Disaster Recovery: Encryption Key Vault Continuity

> [!CRITICAL]
> **Key Vault Dependency**: Personal API keys are sealed using `USER_API_KEY_ENCRYPTION_KEY`. A database backup restored without this exact 32-byte hex secret **cannot decrypt user credentials**.
> 
> - Store `USER_API_KEY_ENCRYPTION_KEY` in an enterprise key vault (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault).
> - Never store the encryption key within the database or alongside database backup archives.
> - If the encryption key is lost, personal keys cannot be recovered; users must delete the unreadable keys and submit new credentials.

---

## 9. Incident Response & Troubleshooting Runbooks

### 9.1 Emergency Incident Matrix

| Symptom / Alert | Root Cause Category | Diagnostic Command | Immediate Remediation Action |
| :--- | :--- | :--- | :--- |
| **HTTP 503 on `/api/ready`** | MongoDB connection loss or replica failover | `docker logs medassist-mongo --tail 50` | Verify MongoDB container status; check disk space on `medassist-mongo-data` volume; restart Mongo container if deadlocked. |
| **HTTP 403 `ORIGIN_DENIED`** | `CLIENT_ORIGIN` does not match browser Origin header | `docker logs medassist-backend --grep ORIGIN_DENIED` | Update `CLIENT_ORIGIN` in root `.env` to match the exact browser protocol and domain (including port if non-standard). Restart backend. |
| **WebSocket 4001 Disconnects** | Monotonic `sessionVersion` invalidation | Inspect user's multi-device login activity | Normal behavior when an account signs in from a second browser/tab. Inform user of single active session policy. |
| **HTTP 429 `RATE_LIMIT`** | Tiered rate limiter exceeded | Inspect client IP and endpoint route | Ingress rate limit exceeded. Verify if `TRUST_PROXY` is configured correctly so client IPs are not collapsed to `127.0.0.1`. |
| **Generations Fall Back to References Only** | Missing abstracts, invalid citations, or AI timeout | Inspect backend structured logs for `code: AI_UNAVAILABLE` | Check external provider status (Gemini, Groq, Together AI); verify API keys and account quotas; verify outbound HTTPS reachability. |

### 9.2 Complete Pre-Release Verification Protocol

Execute the full suite of automated and headless browser regression tests prior to any production deployment:

```powershell
# 1. Run master aggregate verification suite
node scripts/verify_project.cjs

# 2. Run production build QA against synthetic services
node scripts/run_build_qa.cjs --fixtures

# 3. Execute headless browser smoke test suite against built distribution
node scripts/browser_smoke.cjs

# 4. Execute dark mode, calculators, and accessibility browser test suite
node scripts/browser_verify_dark_and_tools.cjs

# 5. Check audit output reports
Get-Content output/qa/automated-results.json
Get-Content output/qa/browser-results.json
```


---

## 10. Production Acceptance Verification & Rollback Procedures

MedAssist AI enforces a deterministic acceptance checklist and automated rollback state machine to prevent broken builds or corrupted database schemas from persisting in production:

```
========================================================================================================================
                                     PRODUCTION ACCEPTANCE & ROLLBACK STATE MACHINE
========================================================================================================================

    [ Host Cutover Triggered ] ──► docker compose up -d --build
                 │
                 ▼
    [ Tier 1: Container Vitality Probe ]
    ├── Probe: curl -f http://127.0.0.1:8080/healthz (Exit code 0 required)
    └── Probe: curl -f http://127.0.0.1:8080/api/health (HTTP 200 required)
                 │
                 ├── FAIL (Timeout / 5xx) ──► ROLLBACK TRIGGERED: docker compose down && docker compose up -d (Previous)
                 │
                 ▼ PASS
    [ Tier 2: Subsystem Readiness Probe ]
    ├── Probe: curl -f http://127.0.0.1:8080/api/ready (HTTP 200 required)
    ├── Verifies MongoDB connection state (readyState === 1)
    └── Verifies AI Provider and Email dispatch service readiness
                 │
                 ├── FAIL (Database disconnected / 503) ──► ROLLBACK TRIGGERED: inspect mongo logs, restart mongo
                 │
                 ▼ PASS
    [ Tier 3: Browser End-to-End Acceptance ]
    ├── Execute: node scripts/browser_verify_dark_and_tools.cjs
    └── Verifies 13 clinical calculators, 14 FDA DDI banners, and emergency deflections
                 │
                 ├── FAIL ──► CANARY ISOLATION: Host Nginx remains on stable upstream
                 │
                 ▼ PASS
    [ Promotion to Active Public Traffic ] ──► sudo systemctl reload nginx (Zero-downtime cutover)
========================================================================================================================
```

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0284c7', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#0369a1', 'lineColor': '#0284c7', 'secondaryColor': '#0d9488', 'tertiaryColor': '#6366f1' }}}%%
mindmap
  root((Release Acceptance))
    ::icon(fa fa-check-circle)
    (01 Container Probes)
      Nginx Ingress /healthz
      Express Process /api/health
      Database Wire /api/ready
    (02 End-to-End Verification)
      178+ Master Gate Tests
      Browser Smoke Playwright
      Dark Theme & ARIA Trapping
      13 Clinical Calculators
    (03 Rollback Playbook)
      Immediate Container Stop
      Tag-Pinned Docker Image Rollback
      Point-in-Time mongorestore
      Nginx Upstream Reversion
    (04 Telemetry Handshake)
      UUIDv4 Tracing Verification
      Structured JSON Emission
      429 Rate Limiter Sanity
```

### 10.1 Automated Rollback Playbook

If any acceptance probe fails following an upgrade or schema migration:

```bash
#!/usr/bin/env bash
# /opt/medassist/scripts/rollback_deployment.sh
set -euo pipefail

PREVIOUS_TAG="${1:-latest-stable}"
echo "[$(date)] INITIATING EMERGENCY ROLLBACK to tag: ${PREVIOUS_TAG}"

# Step 1: Revert Git repository to previous stable commit tag
git checkout "${PREVIOUS_TAG}"

# Step 2: Re-launch previous container specification
docker compose down --timeout 10
docker compose up -d --build

# Step 3: Verify reverted container health
sleep 5
curl -f http://127.0.0.1:8080/healthz || { echo "CRITICAL: Ingress failed rollback!"; exit 1; }
curl -f http://127.0.0.1:8080/api/ready || { echo "CRITICAL: Backend readiness failed rollback!"; exit 1; }

# Step 4: Reload host Nginx proxy
sudo nginx -t && sudo systemctl reload nginx
echo "[$(date)] ROLLBACK SUCCESSFUL: Production restored to ${PREVIOUS_TAG}"
```

---

## 11. Developer Operations & Infrastructure Extensibility

For DevOps engineers and infrastructure contributors extending MedAssist AI to enterprise Kubernetes clusters, automated blue-green cutover fabrics, or custom Prometheus/Grafana observability pipelines, this section provides production-grade architectural patterns, ASCII orchestration flows, colorful mindmaps, and implementation configurations.

```
========================================================================================================================
                          MEDASSIST AI — ENTERPRISE BLUE-GREEN & KUBERNETES TOPOLOGY
========================================================================================================================

    [ CLOUD TRAFFIC / DNS / ANYCAST IP ]
                    │
                    ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                INGRESS CONTROLLER (Nginx Ingress / AWS ALB)                                    │
    │  - Annotations: cert-manager.io/cluster-issuer: letsencrypt-prod                                               │
    │  - Weighted Traffic Routing: 90% Blue (Stable) / 10% Green (Canary)                                            │
    │  - Strict Path Routing: /api -> backend-svc, /ws -> backend-svc, / -> frontend-svc                            │
    └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                    │                                                                │
     (90% Traffic)  │                                                                │  (10% Canary Probe)
                    ▼                                                                ▼
    ┌────────────────────────────────────────────────┐              ┌────────────────────────────────────────────────┐
    │          BLUE FLEET (Current Stable)           │              │             GREEN FLEET (Candidate)            │
    │  - Deployment: medassist-backend-blue:v2.4.0   │              │  - Deployment: medassist-backend-green:v2.5.0  │
    │  - Replicas: 4 Pods across 3 Availability Zones│              │  - Replicas: 2 Pods (Isolated Canary Node)     │
    │  - Readiness: httpGet /api/ready port 5000     │              │  - Readiness: httpGet /api/ready port 5000     │
    │  - Liveness: httpGet /api/health port 5000     │              │  - Liveness: httpGet /api/health port 5000     │
    └────────────────────────────────────────────────┘              └────────────────────────────────────────────────┘
                    │                                                                │
                    └───────────────────────────────┬────────────────────────────────┘
                                                    │
                                                    ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                           TIER 3: MONGODB REPLICA SET (StatefulSet / Atlas VPC)                                │
    │  - Cluster Topology: 3-Member Primary-Secondary-Secondary Replica Set with Automatic Election                 │
    │  - Storage: PersistentVolumeClaim with gp3 SSD / io2 Block Storage (Encrypted at Rest)                         │
    │  - Backup Engine: Automated Volume Snapshots + Hourly Oplog Archiving to S3 Glacier                             │
    └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
========================================================================================================================
```

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0284c7', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#0369a1', 'lineColor': '#0284c7', 'secondaryColor': '#0d9488', 'tertiaryColor': '#6366f1' }}}%%
mindmap
  root((DevOps Extensibility))
    ::icon(fa fa-server)
    (01 Kubernetes Deployment)
      StatefulSet MongoDB
        3-Node Replica Set
        Encrypted PVC gp3 Volumes
        mongo-init Least-Privilege
      Deployment Backend
        HPA 2 to 10 Replicas
        Resource Limits 1 CPU 1Gi RAM
        Readiness Probe /api/ready
        Liveness Probe /api/health
      Deployment Frontend Nginx
        Static Assets Dist
        Reverse Proxy Ingress
        Security Headers Policy
    (02 Blue-Green Pipeline)
      Canary Release Stage
        10% Traffic Weight
        Error Rate Metric Gate (<0.01%)
        Latency p99 Gate (<800ms)
      Instant Cutover
        Zero-Downtime Service Switch
        Graceful SIGTERM Pod Draining
        Fast Rollback on Health Alert
    (03 Observability Mesh)
      Prometheus Metrics
        HTTP Request Duration Histograms
        Active WebSocket Connections
        PubMed API Outbound Latency
        AES Vault Decryption Counters
      Grafana Dashboards
        Real-Time Request Rates
        Error Heatmaps by Endpoint
        MongoDB WiredTiger Cache Utilization
```

### 11.1 Production Kubernetes Manifest (`deploy/k8s/backend-deployment.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: medassist-backend
  namespace: medassist-prod
  labels:
    app.kubernetes.io/name: medassist-backend
    app.kubernetes.io/part-of: medassist-ai
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: medassist-backend
  template:
    metadata:
      labels:
        app: medassist-backend
    spec:
      containers:
        - name: backend
          image: ghcr.io/ganesh172919/medassist-backend:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 5000
              name: http
          envFrom:
            - secretRef:
                name: medassist-secrets
            - configMapRef:
                name: medassist-config
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          readinessProbe:
            httpGet:
              path: /api/ready
              port: 5000
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 2
          livenessProbe:
            httpGet:
              path: /api/health
              port: 5000
            initialDelaySeconds: 15
            periodSeconds: 20
            timeoutSeconds: 5
            failureThreshold: 3
          securityContext:
            runAsNonRoot: true
            runAsUser: 10001
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
```

### 11.2 Automated Blue-Green Promotion Script (`scripts/promote_green_release.sh`)

```bash
#!/usr/bin/env bash
# scripts/promote_green_release.sh - Automated zero-downtime canary evaluation and cutover
set -euo pipefail

NAMESPACE="medassist-prod"
CANARY_WEIGHT=10
PROMOTION_TARGET="medassist-backend-green"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Starting automated Canary verification for ${PROMOTION_TARGET}..."

# 1. Verify that Green deployment pods are 100% ready
READY_REPLICAS=$(kubectl get deployment "${PROMOTION_TARGET}" -n "${NAMESPACE}" -o jsonpath='{.status.readyReplicas}')
DESIRED_REPLICAS=$(kubectl get deployment "${PROMOTION_TARGET}" -n "${NAMESPACE}" -o jsonpath='{.spec.replicas}')

if [ "${READY_REPLICAS}" -ne "${DESIRED_REPLICAS}" ]; then
  echo "ERROR: Canary pods not fully ready (${READY_REPLICAS}/${DESIRED_REPLICAS}). Aborting promotion."
  exit 1
fi

# 2. Run automated HTTP readiness probe against Green pod IP
CANARY_POD_IP=$(kubectl get pods -n "${NAMESPACE}" -l app=medassist-backend-green -o jsonpath='{.items[0].status.podIP}')
echo "Probing Green Canary Pod at http://${CANARY_POD_IP}:5000/api/ready..."
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${CANARY_POD_IP}:5000/api/ready" || echo "000")

if [ "${STATUS_CODE}" != "200" ]; then
  echo "ERROR: Green Canary returned non-200 status (${STATUS_CODE}). Triggering teardown."
  kubectl scale deployment "${PROMOTION_TARGET}" -n "${NAMESPACE}" --replicas=0
  exit 1
fi

# 3. Cutover active Service selector to Green
echo "Promoting Green fleet to active traffic..."
kubectl patch service medassist-backend-svc -n "${NAMESPACE}" -p '{"spec":{"selector":{"app":"medassist-backend-green"}}}'

# 4. Scale down old Blue deployment after 30-second connection drain
echo "Draining old Blue deployment connections..."
sleep 30
kubectl scale deployment medassist-backend-blue -n "${NAMESPACE}" --replicas=0
echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Promotion completed successfully with zero downtime!"
```
