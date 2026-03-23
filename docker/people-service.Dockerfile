# Build context: repo root
# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files and ALL workspace package.json files so npm ci can
# resolve the full workspace graph from the lock file
COPY package.json package-lock.json ./
COPY admin-portal/package.json ./admin-portal/
COPY services/venue-service/package.json ./services/venue-service/
COPY services/people-service/package.json ./services/people-service/
COPY services/booking-service/package.json ./services/booking-service/
COPY services/admin-service/package.json ./services/admin-service/
COPY services/membership-service/package.json ./services/membership-service/
COPY services/template-service/package.json ./services/template-service/

# Copy prisma schema for this service
COPY services/people-service/prisma ./services/people-service/prisma/

# Install all workspace deps from the pinned lock file
RUN npm ci

# Generate Prisma client
RUN cd services/people-service && npx prisma generate

# Copy source and build
COPY services/people-service/tsconfig*.json services/people-service/nest-cli.json ./services/people-service/
COPY services/people-service/src ./services/people-service/src
RUN cd services/people-service && npm run build

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
COPY services/people-service/prisma ./services/people-service/prisma/

RUN npm ci --omit=dev && cd services/people-service && npx prisma generate

COPY --from=builder /app/services/people-service/dist ./services/people-service/dist

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 4004

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4004/health || exit 1

CMD ["node", "services/people-service/dist/main.js"]
