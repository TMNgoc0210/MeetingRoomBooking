# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Backend runtime ──────────────────────────────────────────────────
FROM node:20-alpine
# Build tools required for better-sqlite3 (native module)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY backend/ ./

# Copy React build → backend serves as static files
COPY --from=frontend /frontend/dist ./public

# Copy startup script
COPY backend/start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080

CMD ["sh", "./start.sh"]
