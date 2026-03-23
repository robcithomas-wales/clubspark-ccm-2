# Build context: repo root
# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/admin-service/package.json ./services/admin-service/
COPY services/admin-service/prisma ./services/admin-service/prisma/

RUN npm ci --workspace=@clubspark/admin-service

RUN cd services/admin-service && npx prisma generate

COPY services/admin-service/tsconfig*.json services/admin-service/nest-cli.json ./services/admin-service/
COPY services/admin-service/src ./services/admin-service/src

RUN cd services/admin-service && npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY services/admin-service/package.json ./services/admin-service/
COPY services/admin-service/prisma ./services/admin-service/prisma/

RUN npm ci --workspace=@clubspark/admin-service --omit=dev && \
    cd services/admin-service && npx prisma generate

COPY --from=builder /app/services/admin-service/dist ./services/admin-service/dist

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 4006

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4006/health || exit 1

CMD ["node", "services/admin-service/dist/main.js"]
