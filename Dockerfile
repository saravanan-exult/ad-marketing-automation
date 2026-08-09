# Production Dockerfile for Ad Tech Marketing Automation Platform
FROM node:24.11.0-alpine AS builder

WORKDIR /app

# Copy package manifests for layer caching
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies for both frontend and backend
RUN npm install --prefix backend
RUN npm install --prefix frontend

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build frontend static bundle and NestJS backend dist
RUN npm run build --prefix frontend
RUN npm run build --prefix backend

# Production runtime stage
FROM node:24.11.0-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Copy package manifest and node_modules from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/build ./frontend/build
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/node_modules ./node_modules

# Ensure data directory exists with write permissions for non-root user
RUN mkdir -p /app/backend/data && chown -R node:node /app

# Use non-root node user for enhanced production security
USER node

WORKDIR /app/backend
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/main.js"]
