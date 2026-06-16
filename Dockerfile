# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Backend runtime ──────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

# Copy React build → backend serves as static files
COPY --from=frontend /frontend/dist ./public

RUN mkdir -p uploads/images uploads/docs

EXPOSE 5001
ENV NODE_ENV=production

CMD ["node", "server.js"]
