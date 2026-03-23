# Build context: repo root
# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/template-service/package.json ./services/template-service/
COPY services/template-service/prisma ./services/template-service/prisma/

RUN npm ci --workspace=@clubspark/template-service

RUN cd services/template-service && npx prisma generate

COPY services/template-service/tsconfig*.json services/template-service/nest-cli.json ./services/template-service/
COPY services/template-service/src ./services/template-service/src

RUN cd services/template-service && npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY services/template-service/package.json ./services/template-service/
COPY services/template-service/prisma ./services/template-service/prisma/

RUN npm ci --workspace=@clubspark/template-service --omit=dev && \
    cd services/template-service && npx prisma generate

COPY --from=builder /app/services/template-service/dist ./services/template-service/dist

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "services/template-service/dist/main.js"]
