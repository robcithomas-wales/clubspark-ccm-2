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
COPY services/coaching-service/package.json ./services/coaching-service/

COPY services/booking-service/prisma ./services/booking-service/prisma/

RUN npm ci

RUN cd services/booking-service && npx prisma generate

COPY services/booking-service/tsconfig*.json services/booking-service/nest-cli.json ./services/booking-service/
COPY services/booking-service/src ./services/booking-service/src
RUN cd services/booking-service && npm run build

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
COPY services/coaching-service/package.json ./services/coaching-service/
COPY services/booking-service/prisma ./services/booking-service/prisma/

RUN npm ci --omit=dev && cd services/booking-service && npx prisma generate

COPY --from=builder /app/services/booking-service/dist ./services/booking-service/dist

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 4005

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4005/health || exit 1

CMD ["node", "services/booking-service/dist/main.js"]
