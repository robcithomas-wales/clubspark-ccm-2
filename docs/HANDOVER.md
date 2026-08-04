# Handover — state of the platform

> **Date:** 2026-08-03 · **Audience:** engineers picking this up to take it to production
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
cp services/<name>/.env.example services/<name>/.env    # for each service; fill DATABASE_URL
npm run prisma:generate:all       # Prisma clients are git-ignored
npm run build:services
./scripts/run-all.sh start        # or npm run start:services
```

Everything a service needs is in its `.env.example`, including `INTERNAL_SECRET` — see the warning
below. The only value you must supply yourself is `DATABASE_URL` (and `DIRECT_DATABASE_URL`).

### ⚠️ Two things that will bite you

**1. `INTERNAL_SECRET` must be identical across every service.** Services authenticate to each
other's internal endpoints with it, and the guards are **fail-closed** — a missing or mismatched
value means customer merge, people/venue lookups and all domain-event delivery silently stop
working. The `.env.example` default is fine for local work.

**2. Prisma migrations hang on Supabase's transaction pooler (port 6543).** They need the session
connection (5432). That is what `DIRECT_DATABASE_URL` is for; every `schema.prisma` declares
`directUrl`. If a migrate command appears to freeze, this is why. Do **not** reach for
`prisma db push` — see below for what that cost us.

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

1. **4 hot-path `venue.*` reads remain** (unit validation, resource group, unit conflicts, lighting).
   These block regionalization. The design question is unresolved: venue-service has **no event bus**
   and only one of the four tables has an `updated_at`, so neither event-driven nor watermark sync is
   available. Options and a recommendation are in the backlog under MR-3b.
2. **No tenant→region concept exists.** No `home_region` anywhere. Cheapest thing on the list today,
   most expensive later — it touches every request path.
3. **10 `@Cron` jobs across 6 services fire on every replica.** The platform cannot run more than one
   replica of anything without duplicate charges, emails and reminders. (The outbox relay is the
   exception — it uses `FOR UPDATE SKIP LOCKED` and is already safe.)
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
