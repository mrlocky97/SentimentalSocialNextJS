# syntax=docker/dockerfile:1.7

# --- Base dependencies (dev) ---
FROM node:20-alpine AS deps
WORKDIR /app
ENV CI=true
# For some native modules on alpine
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci

# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Production deps only ---
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- Runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
# Minimal runtime packages if needed
RUN apk add --no-cache tini

# Copy production node_modules and built app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD node -e "require('http').get(`http://localhost:${process.env.PORT||3001}/health`,res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","dist/server.js"]
