# ============================================================================
# MEDASSIST AI - FRONTEND MULTI-STAGE DOCKERFILE
# ============================================================================
# Role:
#   Compiles the React Vite SPA into optimized static HTML/JS/CSS assets and
#   serves them via a lightweight Nginx 1.27 Alpine runtime container.
#
# Multi-Stage Pipeline:
#   Stage 1 (build): Node 20 Alpine compiles React application to /app/dist.
#   Stage 2 (serve): Nginx Alpine serves static files and reverse-proxies API.
#
# ----------------------------------------------------------------------------
# MINDMAP FLOW: MULTI-STAGE COMPILATION & RUNTIME
# ----------------------------------------------------------------------------
# [Stage 1: Build]
#        ├── node:20-alpine -> npm ci -> npm run build -> /app/dist
#        │
# [Stage 2: Serve]
#        ├── nginx:1.27-alpine
#        ├── COPY nginx.conf -> /etc/nginx/conf.d/default.conf
#        ├── COPY --from=build /app/dist -> /usr/share/nginx/html
#        └── EXPOSE 80 & HEALTHCHECK /healthz
# ============================================================================
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
