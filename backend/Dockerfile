FROM node:24-alpine
ENV NODE_ENV=production DATASET_REPORT_DIR=/app/dataset-reports
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node backend/ ./
COPY --chown=node:node ["Model and Dataset/reports/dataset_analysis.json", "Model and Dataset/reports/dataset_audit.json", "/app/dataset-reports/"]
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:5000/api/ready || exit 1
CMD ["node", "server.js"]
