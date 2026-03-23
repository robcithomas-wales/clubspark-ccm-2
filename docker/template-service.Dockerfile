# Build context: repo root
# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY admin-portal/package.json ./admin-portal/
COPY services/venue-service/package.json ./services/venue-service/
COPY services/people-service/package.json ./services/people-service/
COPY services/booking-service/package.json ./services/booking-service/
COPY services/admin-service/package.json ./services/admin-service/
COPY services/membership-service/package.json ./services/membership-service/
COPY services/template-service/package.json ./services/template-service/

COPY services/template-service/prisma ./services/template-service/prisma/

RUN npm ci

RUN cd services/template-service && npx prisma generate

COPY services/template-service/tsconfig*.json services/template-service/nest-cli.json ./services/template-service/
COPY services/template-service/src ./services/template-service/src
RUN cd services/template-service && npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY admin-portal/package.json ./admin-portal/
COPY services/venue-service/package.json ./services/venue-service/
COPY services/people-service/package.json ./services/people-service/
COPY services/booking-service/package.json ./services/booking-service/
COPY services/admin-service/package.json ./services/admin-service/
COPY services/membership-service/package.json ./services/membership-service/
COPY services/template-service/package.json ./services/template-service/
COPY services/template-service/prisma ./services/template-service/prisma/

RUN npm ci --omit=dev && cd services/template-service && npx prisma generate

COPY --from=builder /app/services/template-service/dist ./services/template-service/dist

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "services/template-service/dist/main.js"]
