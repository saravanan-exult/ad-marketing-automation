# Production Dockerfile for Ad Tech Marketing Automation Platform
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package manifests
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm install --prefix backend
RUN npm install --prefix frontend

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build applications
RUN npm run build --prefix backend
RUN npm run build --prefix frontend

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules

WORKDIR /app/backend
EXPOSE 3001

ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
