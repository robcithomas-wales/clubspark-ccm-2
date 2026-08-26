# Handover — state of the platform

> **Date:** 2026-08-26 · **Audience:** engineers picking this up to take it to production
> Read this first, then [`CLAUDE.md`](../CLAUDE.md) for conventions.

## What this is

A multi-sport SaaS platform (bookings, people, membership, coaching, teams, competitions, payments,
comms, analytics) — 15 NestJS services, three Next.js portals, PostgreSQL via Prisma, hosted on
Supabase today, targeting Azure.

It is a **pilot being productionised**. There are no real customers and no meaningful data yet, which
is why some fairly invasive fixes below were safe to make.

## Getting it running

```bash
npm install                       # also installs the shared git hooks
cp .env.example .env              # ONE file, at the repo root; fill in 3 values
npm run setup:env                 # generates all 15 services/<name>/.env
npm run check:env                 # verifies they are present and current
npm run prisma:generate:all       # Prisma clients are git-ignored
npm run build:services
./scripts/run-all.sh start        # or npm run start:services
```

You configure the platform **once, at the root**. All 15 services share one database and one
Supabase project, so those values live in the root `.env` and `npm run setup:env` generates each
service's file from it (mode `0600`). Do not hand-edit a generated `.env` — it carries a
`# GENERATED` header and `setup:env` will refuse to overwrite it without `--force`. A value one
service genuinely needs to differ on goes in `services/<name>/.env.override`.

The three required values are `DATABASE_URL`, `SUPABASE_URL` and `INTERNAL_SECRET`. Generate the
last one with `openssl rand -hex 32`.

### ⚠️ Two things that will bite you

**1. `INTERNAL_SECRET` must be identical across every service.** Services authenticate to each
other's internal endpoints with it, and the guards are **fail-closed** — a missing or mismatched
value means customer merge, people/venue lookups and all domain-event delivery silently stop
working. Generating from the root `.env` is what keeps them identical — the 15 services **and** the
internal portal all receive it from `npm run setup:env`, so they cannot drift. There is
deliberately no committed default: a shared default credential on the internal admin surface
(impersonation, feature flags, audit) is worse than a loud failure, so a missing value now throws
with an explanation instead of silently 401ing.

`mobile-app/.env.local` is the one env file the generator does not manage.

**2. Never set `DIRECT_DATABASE_URL`, and never run `prisma migrate` from a service directory.**
Migrations need a session connection (5432) — the transaction pooler (6543) silently hangs on DDL —
*and* a `?schema=<service>` pin, because each service keeps its own `_prisma_migrations` inside its
own schema. Miss the pin and Prisma looks in `public`, finds no history, and reports applied
baselines as *pending*.

Both are derived for you. Use the scripts, never raw Prisma:

```bash
npm run migrate:status    # read-only, all 15 services
npm run migrate:all       # apply; also runs the shared bootstrap SQL and orders passes
npm run check:drift       # proves migrations still match schema.prisma
```

`DIRECT_DATABASE_URL` is deliberately left unset, so an ad-hoc `npx prisma migrate deploy` fails
fast with `P1012` rather than running while skipping the bootstrap and ordering. `npx prisma
validate` and `prisma studio` fail for the same reason — that is expected, not a broken checkout.
`prisma generate` is unaffected.

Do **not** reach for `prisma db push` — see below for what that cost us.

## What changed recently, and why it matters

### The repository can now build its own database

Until 30 July it could not. Six services had models but **zero migrations** — their tables existed
only inside the live Supabase instance, created by `prisma db push`, which records nothing.
order-service had no schema at all; coaching was missing 4 of its 10 tables.

That is a hard blocker on multi-region: standing up a new region *is* "replay the migrations against
a fresh database". Every service is now baselined from `pg_dump`, and **CI proves the whole schema
builds from empty on every PR**.

Full detail: [`engineering/database-migrations.md`](engineering/database-migrations.md).

> Baselines come from `pg_dump`, **not** `prisma migrate diff`. Prisma cannot represent exclusion
> constraints, CHECK constraints, triggers or functions — this database has 1, 40, 26 and 11. A
> Prisma-generated baseline silently dropped `no_overlapping_active_bookings`, the constraint that
> prevents double-booking.

### CI exists

Build + typecheck, lint on changed files, schema-builds-from-empty, and every service suite against
an **ephemeral Postgres container** — no shared CI database, no credentials in GitHub.
[`engineering/ci.md`](engineering/ci.md).

⚠️ **Branch protection is not enabled.** CI reports results but nothing stops a merge past a red
build. Turn this on: Settings → Branches → `main` → require PR + the four checks.

### Domain events are durable, and were previously not arriving at all

Events used to be published fire-and-forget with every error swallowed. Worse, **no publisher sent
`x-internal-secret`** while every subscriber requires it — so in production every domain event was
being rejected and the rejection discarded.

There is now a transactional outbox in booking, membership and payment: the event is written in the
same transaction as the state change, and a relay delivers it with backoff and dead-lettering.

### Auth is one package, not fifteen copies

Every service used to carry its own `tenant-context.guard.ts`. Fifteen copies had become **six
different implementations** — and in two of them `@SkipTenant()` did nothing at all, because
their guard had no `Reflector`. Their health probes only worked via a separate hard-coded
`/health` path check; applying the decorator anywhere else would have produced a silent 401.

It is now [`packages/auth`](../packages/auth/README.md) (`@clubspark/auth`), imported by all 15.
`AuthModule.forRoot(supabaseAuth())` registers the guard globally, so a new route is authenticated
by default, and `check-service.sh` fails the build if a service re-forks a local copy.

**This is what makes the Azure identity move tractable**: `supabaseAuth()` → `entraAuth({...})`,
one line per service, and nothing else knows which provider issued the token.

### Cross-service coupling is partly removed

This is the work that decides whether multi-region is possible. Progress is tracked in
[`roadmap/multi-region-readiness-backlog.md`](roadmap/multi-region-readiness-backlog.md).

| | Status |
|---|---|
| people-service **writing** to `booking.*` / `membership.*` | ✅ removed — replaced by a compensating saga |
| Cross-schema FK `membership → people` | ✅ dropped |
| booking reading `people.*` / `auth.*` | ✅ removed — **this also unblocked Azure**, see below |
| booking reading `venue.*` (display paths, 9 sites) | ✅ removed |
| booking reading `venue.*` (hot paths, 4 sites) | ❌ **remaining** |
| booking reading `coaching.*` (2 sites) | ❌ remaining |

**Why the `auth.*` one mattered beyond regions:** booking joined Supabase's `auth.users`, a schema
that does not exist on plain PostgreSQL *or on Azure Database for PostgreSQL*. booking-service could
not have run on the target platform at all.

## Known issues — read before planning

1. **5 hot-path `venue.*`/`coaching.*` reads remain — but no longer unsolved.** Booking now owns a
   projection of the Venue and Coaching fields it needs, fed by versioned events from transactional
   outboxes in both services (venue-service has an event bus now), with authenticated snapshot
   endpoints for backfill and `npm run projection:ops` for backfill/reconcile/replay. **Every
   projection read is off** — `BOOKING_VENUE_PROJECTION_MODE` and `BOOKING_COACHING_PROJECTION_MODE`
   default to `legacy` and the old SQL is still the live path. Cutover per source is: backfill →
   reconcile → `shadow` → `projection`, then delete the SQL. Blocking that: projection-lag and
   dead-letter metrics, because reads fail closed on an *empty* projection but a populated-yet-lagging
   one still answers. Contract and runbook:
   [`architecture/booking-venue-coaching-projection.md`](architecture/booking-venue-coaching-projection.md).
2. ~~No tenant→region concept exists.~~ **Added 2026-08-05.** `admin.organisations.home_region` is
   NOT NULL; every request carries `tenantContext.region` from `CLUBSPARK_REGION`; a service that
   cannot determine its region refuses to start. **Still open:** the tenant registry is split across
   `admin.organisations` and `venue.organisations`, and routing needs one authoritative registry
   outside every region — see
   [`architecture/data-classification.md`](architecture/data-classification.md).
3. ~~10 `@Cron` jobs fire on every replica.~~ **Addressed 2026-08-25.** Queue-like work claims rows
   (`FOR UPDATE SKIP LOCKED` plus a lease), whole-dataset batches take a database-time lease in
   `<schema>.scheduled_job_leases`, campaign dispatch claims by atomic status transition, and
   reminders claim-and-enqueue in one transaction. Relays stay row-claiming so they remain
   horizontally scalable. **Still open:** two-runner concurrency tests per side effect, and job
   duration/skipped-run/stale-work metrics — so treat multi-replica as *designed for* but not yet
   *proven*. Inventory: [`architecture/scheduled-job-safety.md`](architecture/scheduled-job-safety.md).
4. **Auth is Supabase JWKS** — single-region by construction. Moving to Entra External ID is
   still a decision that shapes the platform, but it is no longer a fifteen-service refactor:
   auth now lives in [`packages/auth`](../packages/auth/README.md) and each service selects a
   provider with one line (`supabaseAuth()` → `entraAuth({...})`). Extracting it also fixed two
   services whose `@SkipTenant()` was silently inert.
5. ~~Three services have known schema drift.~~ **Resolved 2026-08-04.** All 14 services are clean and
   `KNOWN_DRIFT` in `scripts/check-migration-drift.sh` is empty — keep it empty; a name added there
   silences a real signal. Fixing it required adding the 15 missing foreign keys, which in turn
   surfaced a latent bug (four membership columns the code wrote `null` into are `NOT NULL` in the
   database). See [`engineering/database-migrations.md`](engineering/database-migrations.md).
6. **~15,000 lint problems**, overwhelmingly Prettier formatting. CI lints only changed files so new
   work stays clean; clearing the backlog is a separate, mechanical PR.
7. **Three orphaned schemas** (`identity`, `crm`, `customer` — 13 empty, unreferenced tables) and a
   retired `public._prisma_migrations_pre_20260731` table still exist in the live database.

## Things that will surprise you

- **The live database has objects that appear in no migration.** Four cross-schema foreign keys were
  applied by hand. Auditing the schema from `prisma/migrations/` alone gives wrong answers — query
  `pg_constraint`. Two are now dropped; the two that remain sit entirely between the orphaned
  `crm` and `identity` schemas, so **no service schema has a cross-schema foreign key any more**.
- **Removing a column from raw SQL never fails the compiler.** `$queryRaw<T>` trusts the declared
  type. This bit twice: both times a query stopped selecting customer/venue fields while the type
  still declared them, so reminders would have gone out with no recipient. If you edit raw SQL,
  update the type in the same change.
- **Service schema names do not always match service names.** order-service owns `commerce`;
  entitlement-service owns `entitlements`.
- **Two services' routes are unversioned.** booking-service enables URI versioning with no
  `defaultVersion` and most controllers declare none, so it serves `/bookings`, not `/v1/bookings`.
  membership-service has no versioning at all. Do not assume a `/v1` prefix — that assumption was
  silently 404ing the financial-profile lookups.
- **Integration tests need a real database** and are skipped without one. `checkDbAvailable()`
  returns false and vitest exits 0 — a green run that verified nothing. CI guards against this
  explicitly; be careful drawing conclusions from a local run.
- **`@Cron` jobs are not registered when `NODE_ENV=test`**, because a job firing mid-test races the
  assertions. Tests that exercise a job call its method directly.

## Moving this repository

Verified 2026-08-26, before the move to a corporate organisation:

- **No credential has ever been committed.** 151 commits scanned: no `.env` was ever tracked, no
  JWTs, no `service_role` key, no private keys. Every `postgresql://` string in history is a
  placeholder (`<password>`, `[password]`) or `postgres@localhost` for CI. No history rewrite is
  needed before a transfer.
- **CI requires no secrets.** `.github/workflows/ci.yml` references none — the migration and test
  jobs run against an ephemeral Postgres 17 container, so nothing needs re-provisioning in a new
  organisation.
- 32 MB of git history, no large blobs.
- Prefer GitHub's **Transfer ownership** over pushing to a fresh remote: transfer keeps history, pull
  requests and review threads, and redirects the old URL. After it lands, check Actions are enabled,
  branch protection on `main`, a CODEOWNERS file, and run `git remote set-url origin <new-url>`.
- Live credentials (Supabase database and auth) exist only in git-ignored local `.env` files, which
  the transfer does not touch. They move to Azure Key Vault with the deployment.

## Moving to Azure

[`engineering/azure-migration-runbook.md`](engineering/azure-migration-runbook.md). The short
version: Supabase is used for **only** Postgres hosting and Auth — no Storage, Realtime, Edge
Functions or RLS — so it is two independent workstreams.

The backend is ready: `@clubspark/auth` means one line per service, and the repo builds its own
schema from empty. **The work is in the four front-ends**, which still call the Supabase SDK
directly from 176 files. Two traps: `btree_gist` must be allow-listed via `azure.extensions` before
any migration will run, and Entra emits none of our custom claims until a claims-mapping policy is
configured.

## Where to start

1. **Enable branch protection** — everything else assumes CI is enforced.
2. **Work the backlog in order**: [`roadmap/multi-region-readiness-backlog.md`](roadmap/multi-region-readiness-backlog.md).
   MR-3b next, then the cron leader election, then tenant→region.
3. **Read the ADR** before making structural calls:
   [`architecture/scalability-and-multi-region.md`](architecture/scalability-and-multi-region.md).

The governing principle, from
[`roadmap/pilot-to-production.md`](roadmap/pilot-to-production.md): do the work that is expensive to
retrofit — data ownership, service boundaries, communication patterns — before building features on
top of it. Infrastructure (Redis, read replicas, gateway, IaC) is additive and can wait.
