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
JWT and read tenant context from it, all through the shared **`@clubspark/auth`**
package (one guard, not fifteen copies; swapping to Azure Entra is a one-line change
per service). Multi-tenant: tenant/organisation context comes from
the JWT and/or `x-tenant-id` / `x-organisation-id` headers for service-to-service calls.

## Repository layout

| Path | What it is |
|---|---|
| `packages/*` | Shared libraries used by the services — currently `@clubspark/auth` |
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

# Build all services (builds packages/* first — services need their dist/)
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

**Configure once, at the repo root — never per service.**

```bash
cp .env.example .env      # fill in 3 required values
npm run setup:env         # generates all 15 services/<name>/.env
npm run check:env         # verifies they are present and current
```

All 15 services share one database and one Supabase project, so those values live in the root
`.env` (git-ignored) and nowhere else. `npm run setup:env` generates each
`services/<name>/.env` **and all three portals' `.env.local`** from it, writing them `0600`.
**Do not hand-edit a generated file** — it carries a `# GENERATED` header, and setup:env refuses to
overwrite a hand-edited one without `--force`. If one service truly needs a different value, put it
in `services/<name>/.env.override` (security-relevant keys are rejected there — see below).
`mobile-app/.env.local` is the only env file not generated.

This replaced 15 hand-maintained copies, which had silently drifted: `booking-service` declared
`PORT=4017` when the canonical port is 4005, and only `template-service` carried the pgbouncer
flags the pooler requires. Derived values are now derived:

- **`PORT` and every `<PEER>_SERVICE_URL`** — from the port table in `scripts/run-all.sh`, so
  they cannot disagree with what actually runs.
- **pgbouncer flags** — `pgbouncer=true&connection_limit=…&pool_timeout=10` are applied in exactly
  one place, each service's `PrismaService`, reading `DB_CONNECTION_LIMIT` (default 1). Both flags
  are required: without `pgbouncer=true` Prisma issues prepared statements a transaction pooler
  cannot support, and without a connection cap 15 services exhaust the shared pool (the reason
  running services must be killed before a push). Keep `DATABASE_URL` free of a query string —
  appending the flags in two places produces a doubled query string that Prisma currently tolerates
  (last duplicate wins, so the other value is silently ignored) and a future version will reject.
- **`DIRECT_DATABASE_URL` — do not set it.** Nothing at runtime reads it; only the Prisma CLI
  uses `directUrl`. `migrate:all`, `check:drift` and `migrate:status` each derive it themselves
  (session port 5432 plus the per-service `?schema=` pin). Leaving it unset means an ad-hoc
  `npx prisma migrate deploy` inside a service directory fails fast rather than running while
  skipping the shared bootstrap SQL and the cross-schema ordering passes.
- **`SUPABASE_SERVICE_ROLE_KEY`** bypasses RLS, so it goes only to the services on the allowlist
  in `scripts/setup-env.mjs` (currently comms and venue) — not to all 15.
- **`CLUBSPARK_REGION`** — the region this instance serves. Required in production; defaults to
  `eu-west-2` under `NODE_ENV=test`/`development`. A service that cannot determine its region
  **refuses to start**, because it cannot then tell whether it may serve a given tenant.

Never commit a real `.env`. Only `.env.example` files are tracked, and `*.bak` is ignored so a
saved backup cannot leak credentials either.

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
  plus its later migrations, and its own `_prisma_migrations` table — which Prisma only finds if
  **`DIRECT_DATABASE_URL` pins `?schema=<service>`**. Omit it and Prisma looks in `public`, sees no
  history, and reports applied baselines as *pending* — one `migrate deploy` away from trying to
  recreate live tables. Note the schema name is not always the service name (`order-service` →
  `commerce`, `competition-service` → `competitions`, `entitlement-service` → `entitlements`).
  `npm run migrate:all` builds a database from empty; `npm run check:drift`
  proves migrations still match `schema.prisma`. CI runs both on a throwaway Postgres every PR.
  ⚠️ Prisma migrate **hangs** on Supabase's transaction pooler (6543) — it needs the session
  connection (5432), which is what `DIRECT_DATABASE_URL` / `directUrl` is for. Full detail:
  [`docs/engineering/database-migrations.md`](docs/engineering/database-migrations.md).
- **Data residency is a hard boundary.** Every request carries `tenantContext.region`, and
  `admin.organisations.home_region` records where a tenant's data must live. Before adding a table,
  check [`docs/architecture/data-classification.md`](docs/architecture/data-classification.md):
  regional by default, global only by explicit exception. Note that 27 tables inherit tenancy
  through a foreign key and have no `tenant_id` of their own — anything enumerating "all of a
  tenant's data" must traverse the parent or it will silently miss them.
- **Auth comes from `@clubspark/auth` — never re-implement it.** A service wires it with
  `AuthModule.forRoot(supabaseAuth())` in `app.module.ts`, which registers the tenant guard
  globally, so **every route is authenticated unless it carries `@SkipTenant()`**. Use
  `InternalSecretGuard` for service-to-service routes. Do not copy the guard into a service:
  fifteen local copies drifted into six variants, two of which silently ignored `@SkipTenant()`,
  and `check-service.sh` now fails on a local copy. Full detail:
  [`packages/auth/README.md`](packages/auth/README.md).
- **TypeScript ESM:** services import with explicit `.js` extensions (e.g.
  `./app.module.js`). Match the existing style. (Note: despite this, every service actually
  *compiles* to CommonJS — `"module": "CommonJS"` with no `"type": "module"`. Shared packages
  must emit CommonJS to be requireable.)
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
compliance — the standard service shape, `AuthModule.forRoot()` wiring (and no re-forked
local copy of the shared guards), and cwd-independent env
loading. `@architecture-reviewer` runs this checker as its first pass.
