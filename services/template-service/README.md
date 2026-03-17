# ClubSpark NestJS Service Template

Copy this directory to create a new service. It provides:

- NestJS 10 with **Fastify adapter** (not Express — 3x throughput)
- TypeScript + strict mode
- Prisma (write + read replica clients)
- Global tenant context guard (`x-tenant-id` / `x-organisation-id` headers)
- Global exception filter (consistent error response shape)
- Global logging interceptor
- Swagger / OpenAPI docs at `/api/docs` (non-production)
- Global validation pipe (class-validator DTOs)
- Docker multi-stage build with non-root user
- Health check endpoints (`/health`, `/health/db`)

## Creating a new service

```bash
# 1. Copy the template
cp -r services/template-service services/my-new-service

# 2. Update package.json name
# Change: "name": "@clubspark/template-service"
# To:     "name": "@clubspark/my-new-service"

# 3. Update the port in .env.example and main.ts

# 4. Update prisma/schema.prisma with your service's schema

# 5. Install dependencies
cd services/my-new-service
npm install

# 6. Copy env file
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL etc.

# 7. Run migrations
npm run prisma:migrate:dev

# 8. Start development
npm run dev
```

## Service structure

```
src/
  main.ts                    — Fastify adapter, Swagger, validation pipe
  app.module.ts              — Root module, global providers
  config/
    configuration.ts         — Typed config from env vars
  common/
    guards/
      tenant-context.guard.ts      — Extracts x-tenant-id header
    filters/
      http-exception.filter.ts     — Normalises error responses
    interceptors/
      logging.interceptor.ts       — Request logging
    decorators/
      tenant-context.decorator.ts  — @TenantCtx() param decorator
  prisma/
    prisma.service.ts        — Write + read PrismaClient instances
    prisma.module.ts         — Global module (available everywhere)
  health/
    health.controller.ts     — /health and /health/db endpoints
  [domain]/                  — Add your domain modules here
    [domain].module.ts
    [domain].controller.ts
    [domain].service.ts
    [domain].repository.ts   — All SQL lives here
    dto/
    entities/
```

## Response envelope convention

All API responses follow this shape:

```typescript
// List
{ data: T[], pagination: { total, page, limit, totalPages } }

// Single item
{ data: T }

// Error (handled by AllExceptionsFilter)
{ error: string, message: string, statusCode: number }
```

## Adding a domain module

```bash
# Use NestJS CLI (installed via nest-cli.json)
npx nest g module bookings
npx nest g controller bookings
npx nest g service bookings
```

Then create `bookings.repository.ts` manually — all SQL belongs there.
