# Build context: repo root
# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/membership-service/package.json ./services/membership-service/
COPY services/membership-service/prisma ./services/membership-service/prisma/

RUN npm ci --workspace=@clubspark/membership-service

RUN cd services/membership-service && npx prisma generate

COPY services/membership-service/tsconfig*.json services/membership-service/nest-cli.json ./services/membership-service/
COPY services/membership-service/src ./services/membership-service/src

RUN cd services/membership-service && npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY services/membership-service/package.json ./services/membership-service/
COPY services/membership-service/prisma ./services/membership-service/prisma/

RUN npm ci --workspace=@clubspark/membership-service --omit=dev && \
    cd services/membership-service && npx prisma generate

COPY --from=builder /app/services/membership-service/dist ./services/membership-service/dist

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 4010

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4010/health || exit 1

CMD ["node", "services/membership-service/dist/main.js"]
