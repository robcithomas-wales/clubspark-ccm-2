# Build context: repo root
# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/venue-service/package.json ./services/venue-service/
COPY services/venue-service/prisma ./services/venue-service/prisma/

RUN npm ci --workspace=@clubspark/venue-service

RUN cd services/venue-service && npx prisma generate

COPY services/venue-service/tsconfig*.json services/venue-service/nest-cli.json ./services/venue-service/
COPY services/venue-service/src ./services/venue-service/src

RUN cd services/venue-service && npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY services/venue-service/package.json ./services/venue-service/
COPY services/venue-service/prisma ./services/venue-service/prisma/

RUN npm ci --workspace=@clubspark/venue-service --omit=dev && \
    cd services/venue-service && npx prisma generate

COPY --from=builder /app/services/venue-service/dist ./services/venue-service/dist

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 4003

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4003/health || exit 1

CMD ["node", "services/venue-service/dist/main.js"]
