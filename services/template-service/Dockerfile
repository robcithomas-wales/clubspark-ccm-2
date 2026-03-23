# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including dev for build)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source and build
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev && npx prisma generate

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 4000

# Health check — Azure Container Apps uses this for readiness probes
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/main.js"]
