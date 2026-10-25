# ============================================================================
# MEDASSIST AI - BACKEND PRODUCTION DOCKERFILE
# ============================================================================
# Role:
#   Builds lightweight, unprivileged Node.js 20 Alpine container image for the
#   Express API and WebSocket services.
#
# Security & Best Practices:
#   - Deterministic dependencies: `npm ci --omit=dev`
#   - Rootless execution: `USER node`
#   - Active health checking: Periodic ping to `/api/health`
#
# ----------------------------------------------------------------------------
# MINDMAP FLOW: CONTAINER IMAGE ASSEMBLY
# ----------------------------------------------------------------------------
# [Base: node:20-alpine]
#        ├── 1. WORKDIR /app
#        ├── 2. COPY package*.json & npm ci --omit=dev
#        ├── 3. COPY --chown=node:node application source
#        ├── 4. Switch to non-root USER node
#        ├── 5. EXPOSE 5000 & Configure HEALTHCHECK
#        └── 6. CMD ["node", "server.js"]
# ============================================================================
FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .
USER node

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1

CMD ["node", "server.js"]
