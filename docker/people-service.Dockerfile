# Build context: repo root
# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/people-service/package.json ./services/people-service/
COPY services/people-service/prisma ./services/people-service/prisma/

RUN npm ci --workspace=@clubspark/people-service

RUN cd services/people-service && npx prisma generate

COPY services/people-service/tsconfig*.json services/people-service/nest-cli.json ./services/people-service/
COPY services/people-service/src ./services/people-service/src

RUN cd services/people-service && npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY services/people-service/package.json ./services/people-service/
COPY services/people-service/prisma ./services/people-service/prisma/

RUN npm ci --workspace=@clubspark/people-service --omit=dev && \
    cd services/people-service && npx prisma generate

COPY --from=builder /app/services/people-service/dist ./services/people-service/dist

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 4004

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4004/health || exit 1

CMD ["node", "services/people-service/dist/main.js"]
