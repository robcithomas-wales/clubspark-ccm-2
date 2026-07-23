# CLAUDE.md — ClubSpark Platform ("Club and Coach")

Shared project context for Claude Code. This file is committed and loaded on every
session, so every engineer's agent starts with the same understanding of the platform.
Keep it accurate — if you change how something works, update this file in the same PR.

## What this is

`clubspark-platform` — a multi-sport SaaS platform (bookings, people, membership,
coaching, teams, competitions, payments, comms, analytics). Monorepo managed with
**npm workspaces**. Backend is **NestJS on Fastify**; data is **PostgreSQL via Prisma**;
front-ends are **Next.js**. Multi-tenant: requests carry `x-tenant-id` and
`x-organisation-id` headers.

## Repository layout

| Path | What it is |
|---|---|
| `services/*` | 15 NestJS microservices (see table below) |
| `admin-portal/` | Next.js admin app |
| `customer-portal/` | Next.js customer app |
| `internal-portal/` | Next.js internal/staff app |
| `mobile-app/` | Mobile app |
| `e2e/` | Playwright end-to-end suites |
| `docker/` | Local infra (Postgres, etc.) |
| `docs/` | Architecture, specs, reference, migration docs — start at `docs/README.md` |

## Services and local ports

Each service reads `PORT` from env (`src/config/configuration.ts`) with the default below.
Prisma schema lives in each service's `prisma/schema.prisma`.

| Service | Default port |
|---|---|
| template-service | 4000 |
| venue-service | 4003 |
| people-service | 4004 |
| booking-service | 4005 |
| admin-service | 4006 |
| coaching-service | 4007 |
| team-service | 4008 |
| competition-service | 4009 |
| membership-service | 4010 |
| payment-service | 4011 |
| comms-service | 4012 |
| entitlement-service | 4013 ⚠️ |
| integration-service | 4013 ⚠️ |
| analytics-service | 4014 |
| order-service | 4015 |

> ⚠️ **Known port collision:** `entitlement-service` and `integration-service` both
> default to `4013`. They cannot both start on defaults — set `PORT` explicitly for one
> when running both locally.

## Common commands

Run from the repo root unless noted.

```bash
# Install everything (workspaces)
npm install

# Build all services
npm run build:services

# Run all services (+ admin portal)
npm run start:all
# or just the services
npm run start:services

# Dev a single service with watch (examples)
npm run dev:booking
npm run dev:venue
npm run dev:people

# Lint / format (whole repo)
npm run lint
npm run lint:fix
npm run format

# Per-service (run inside services/<name> or via --workspace)
npm run build --workspace=services/booking-service
npm run test  --workspace=services/booking-service   # vitest run
npm run prisma:generate --workspace=services/booking-service
npm run prisma:migrate:dev --workspace=services/booking-service

# E2E
npm run --workspace=e2e test   # Playwright
```

Local infra (Postgres etc.) lives in `docker/` — bring it up before running services
that need a database.

## Conventions (follow these)

- **DTO validation:** use `@IsString()` + `@IsNotEmpty()` for id fields — **do not** use
  `@IsUUID()`. Ids are validated as non-empty strings across this codebase.
- **Before `git push`:** kill running services first
  (`pkill -f "nest start"` / `pkill -f "node dist/main.js"`) — pre-push tests spin up DB
  connections and running services exhaust the connection pool.
- **Multi-tenancy:** service calls expect `x-tenant-id` and `x-organisation-id` headers.
  When testing endpoints locally use the seed tenant/org ids from the service's seed data.
- **Prisma client is generated** (git-ignored under `**/prisma/generated/` and
  `**/src/generated/`) — run `prisma:generate` after install or schema changes.
- **TypeScript ESM:** services import with explicit `.js` extensions (e.g.
  `./app.module.js`). Match the existing style.
- **API versioning:** URI-based (`enableVersioning({ type: VersioningType.URI })`);
  Swagger is served in non-production.

## Working in parallel (multiple engineers / agents)

Use **git worktrees** so simultaneous agent sessions don't collide in one checkout.
Helper: `./scripts/agent-worktree.sh <branch-name>` creates an isolated worktree under
`../worktrees/`. See `docs/agentic-engineering.md` for the full team workflow.

## Agentic tooling

Team workflows live in `.claude/commands/` (slash commands) and `.claude/agents/`
(review roles). These are committed — improve them via PR rather than keeping local copies.
Machine-local overrides go in `.claude/settings.local.json` (git-ignored).
