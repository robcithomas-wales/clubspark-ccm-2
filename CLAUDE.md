# CLAUDE.md — ClubSpark Platform ("Club and Coach")

Shared project context for Claude Code. This file is committed and loaded on every
session, so every engineer's agent starts with the same understanding of the platform.
Keep it accurate — if you change how something works, update this file in the same PR.

## Start here

**New to this codebase?** Read [`docs/HANDOVER.md`](docs/HANDOVER.md) first — current state, how to
run it, known issues, and the two configuration traps that will otherwise cost you an afternoon
(`INTERNAL_SECRET` must match across services; Prisma migrations hang on Supabase's transaction
pooler).

## What this is

`clubspark-platform` — a multi-sport SaaS platform (bookings, people, membership,
coaching, teams, competitions, payments, comms, analytics). Monorepo managed with
**npm workspaces**. Backend is **NestJS on Fastify**; data is **PostgreSQL via Prisma**;
front-ends are **Next.js**. Auth is **Supabase (JWT)** — services validate a Supabase
JWT and read tenant context from it. Multi-tenant: tenant/organisation context comes from
the JWT and/or `x-tenant-id` / `x-organisation-id` headers for service-to-service calls.

## Repository layout

| Path | What it is |
|---|---|
| `services/*` | 15 NestJS microservices (see table below) |
| `admin-portal/` | Next.js admin app |
| `customer-portal/` | Next.js customer app |
| `internal-portal/` | Next.js internal/staff app |
| `mobile-app/` | Mobile app |
| `e2e/` | Playwright end-to-end suites |
| `docker/` | Per-service `*.Dockerfile` for building images (⚠️ not a compose stack — see Local setup) |
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
| entitlement-service | 4013 |
| analytics-service | 4014 |
| order-service | 4015 |
| integration-service | 4016 |

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

## Local setup / environment

There is **no local database and no docker-compose.** The database is **Supabase-hosted
PostgreSQL** and auth is **Supabase JWT**. Both local dev and the test suites connect to
Supabase over the network.

- Each service is configured by its own `services/<name>/.env` (git-ignored). Copy the
  service's `.env.example` to `.env` and fill in real values. Key vars:
  - `DATABASE_URL` — the Supabase Postgres connection string
    (`postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres`).
    Some `.env.example` files still show a `localhost:5432` placeholder — that is stale;
    the real target is Supabase.
  - `SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — auth.
  - `PORT` — see the port table above.
  - `<OTHER>_SERVICE_URL` — service-to-service base URLs (e.g. `PEOPLE_SERVICE_URL`).
- Because tests hit **remote Supabase** (not a local DB), connections are pooled through
  pgbouncer with a low `connection_limit`. This is why running services must be killed
  before a push — otherwise the shared connection pool is exhausted and tests fail.
- Never commit a real `.env`. Only `.env.example` is tracked.

## Deployment (current vs target)

**Today: everything runs locally.** Front-ends and all 15 services run on the developer's
machine via `./scripts/run-all.sh`. The **only hosted dependency is Supabase** (database + auth).
There is no cloud deployment of the app itself yet.

🎯 **Target (near-term): Azure.** The `docker/*.Dockerfile` images and the
`docs/architecture/azure-*` docs describe the *planned* Azure/AKS deployment — the direction of
travel, **not** the current runtime. Secrets today live only in git-ignored local `.env` /
`.env.local` files (plus Supabase creds); they'll move to Azure Key Vault when the platform
deploys there.

## Conventions (follow these)

- **DTO validation:** use `@IsString()` + `@IsNotEmpty()` for id fields — **do not** use
  `@IsUUID()`. Ids are validated as non-empty strings across this codebase.
- **Before `git push`:** kill running services first
  (`pkill -f "nest start"` / `pkill -f "node dist/main.js"`) — the pre-push hook runs
  service tests against **remote Supabase**, and running services exhaust the pooled
  connection limit. (`/safe-push` handles this for you.)
- **Auth & multi-tenancy:** requests carry a **Supabase JWT**; tenant/organisation context
  is read from the JWT and/or `x-tenant-id` / `x-organisation-id` headers for
  service-to-service calls. When testing endpoints locally use the seed tenant/org ids
  from the service's seed data.
- **Prisma client is generated** (git-ignored under `**/prisma/generated/` and
  `**/src/generated/`) — run `prisma:generate` after install or schema changes.
- **Schema changes go through migrations — never `prisma db push`** against a shared database.
  `db push` records nothing, and it is why six services once had tables that existed only in the
  live database and the platform could not rebuild its own schema. Each service owns one baseline
  plus its later migrations, and its own `_prisma_migrations` table (the connection pins
  `?schema=<service>`). `npm run migrate:all` builds a database from empty; `npm run check:drift`
  proves migrations still match `schema.prisma`. CI runs both on a throwaway Postgres every PR.
  ⚠️ Prisma migrate **hangs** on Supabase's transaction pooler (6543) — it needs the session
  connection (5432), which is what `DIRECT_DATABASE_URL` / `directUrl` is for. Full detail:
  [`docs/engineering/database-migrations.md`](docs/engineering/database-migrations.md).
- **TypeScript ESM:** services import with explicit `.js` extensions (e.g.
  `./app.module.js`). Match the existing style.
- **API versioning:** URI-based (`enableVersioning({ type: VersioningType.URI })`);
  Swagger is served in non-production.

## Working in parallel (multiple engineers / agents)

Use **git worktrees** so simultaneous agent sessions don't collide in one checkout.
Helper: `./scripts/agent-worktree.sh <branch-name>` creates an isolated worktree under
`../worktrees/`. See `docs/agentic-engineering.md` for the full team workflow.

## Engineering standards (read before non-trivial work)

Fuller references live in `docs/engineering/` — consult the relevant one and have the matching
reviewer agent (below) check your change:

- [`architecture-principles.md`](docs/engineering/architecture-principles.md) — enforceable architectural invariants (service boundaries, layering, module independence)
- [`coding-standards.md`](docs/engineering/coding-standards.md) — layering, DTO rules, ESM, Prisma, ports
- [`security-and-data-boundaries.md`](docs/engineering/security-and-data-boundaries.md) — tenant isolation, secrets, client/server boundary
- [`testing-strategy.md`](docs/engineering/testing-strategy.md) — pool-safe service tests + Playwright e2e
- [`ai-provider-operations.md`](docs/engineering/ai-provider-operations.md) — how AI features get an Anthropic key (ClubSpark API org, not personal)

## Agentic tooling

Team workflows live in `.claude/commands/` (slash commands) and `.claude/agents/`
(review roles) — all committed; improve them via PR rather than keeping local copies.
Machine-local overrides go in `.claude/settings.local.json` (git-ignored).

Slash commands (`.claude/commands/`) — the codified everyday workflows:

| Command | For |
|---|---|
| `/setup-local` | Bootstrap a checkout — install, `.env` wiring, Prisma generate |
| `/new-service <name> <port> [schema]` | Scaffold a blueprint-compliant service (wraps `new-service.sh`) |
| `/new-endpoint <service> <verb> <path>` | Add an endpoint following the service's existing patterns |
| `/schema-change <service> <change>` | Evolve a Prisma schema — edit → generate → migrate → test |
| `/wire-event <service> <event> <consumers>` | Add a cross-service event the fail-closed event-bus way |
| `/new-portal-page <portal> <feature>` | Add a Next.js page following client/server + service-URL rules |
| `/new-spec <feature>` | Scaffold a `docs/specs/` spec in the standard shape |
| `/debug-service <service>` | Triage a service that won't start / misbehaves locally |
| `/review [target]` | Dispatch the right reviewer agents for what changed |
| `/open-pr` | Full pre-PR gate: branch, kill services, lint, test, review, PR |
| `/safe-push` | Lint + kill services + test, then push a feature branch |
| `/service-test <service>` | Run and green a service's vitest suite |

**Prefer the codified path.** When a request maps to one of the commands above, follow that
command's workflow rather than improvising an equivalent — even if the user asked in plain English
and didn't type the `/command` (e.g. "add a new service" → `/new-service`; "get the tests green" →
`/service-test`; "push this up" → `/safe-push`). Say which command you're following, then run it.
Two caveats: (1) sanity-check the request against reality first — e.g. don't scaffold a service
that already exists (extend it with `/new-endpoint` instead); (2) if no command fits, do the work
directly. Being explicit with the `/command` is always the most reliable trigger.

Reviewer agents (invoke before opening a PR):
- `@service-reviewer` — NestJS service changes vs conventions
- `@portal-reviewer` — Next.js portal changes (service URLs, client/server, secrets)
- `@security-reviewer` — tenant isolation, secrets, auth
- `@test-author` — write vitest tests following the fixtures + pool-safe pattern
- `@architecture-reviewer` — structural integrity vs the recorded architecture (boundaries, layering, principles); use for new services / cross-service / structural changes
- `@product-reviewer` — spec conformance vs `docs/specs/` + `docs/reference/platform-features.md` (does the change deliver what we said, without silent scope drift)

Adding a service? Use `/new-service <name> <port> [schema]` (wraps `scripts/new-service.sh`) —
it clones `template-service` and registers the service in the port table, `build:services`, and
`run-all.sh`. Then `./scripts/check-service.sh <name>` (or `--all`) verifies blueprint
compliance — the standard service shape plus the fail-closed tenant guard and cwd-independent env
loading. `@architecture-reviewer` runs this checker as its first pass.
