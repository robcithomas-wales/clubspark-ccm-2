# Database migrations

> **Status:** Active from 2026-07-30 · Baselines squashed, history rebuilt

## The rule

**Every schema change goes through a migration. Never `prisma db push` against a shared database.**

`db push` applies `schema.prisma` straight to the database and records nothing. It is how this
platform ended up unable to rebuild its own schema.

## What was wrong (and why it mattered)

On 2026-07-30 the repository **could not build its own database**. Discovered while trying to give CI
a throwaway Postgres:

- **Six services had models but zero migrations** — analytics, coaching, competition, order, payment,
  team. 43 models whose tables existed only inside the live Supabase instance.
- **`order-service` had no schema at all.** `commerce` did not exist; the service could not have
  worked against that database.
- **`coaching-service` was missing 4 of its 10 tables** — programmes, programme_sessions, enrolments,
  attendances.
- **booking and venue's "init" migrations were not init migrations.** `0001_booking_service_init`
  `ALTER`s `booking.bookings`, a table no migration ever creates.
- **All 15 services shared `public._prisma_migrations`.** One failed migration returned P3009 for
  every other service, and identical migration names collided.
- **Four cross-schema foreign keys and three orphaned schemas** (`identity`, `crm`, `customer`)
  existed in the database and in no migration file.

Left alone, this would have surfaced at the worst possible moment: standing up region two, which is
exactly "replay the migrations against a fresh regional database".

## How it was fixed

**Baselines are generated with `pg_dump`, not `prisma migrate diff`.** This matters. Prisma cannot
represent exclusion constraints, CHECK constraints, triggers or functions — this database has 1, 40,
26 and 11 of them. A Prisma-generated baseline silently dropped
`no_overlapping_active_bookings`, the EXCLUDE constraint that is the atomic guard against
double-booking. Every future region would have shipped without it.

Each service now has exactly one migration, `00000000000000_baseline_<schema>`, faithful to the
schema as it stood on 2026-07-30. Previous migrations are preserved in
`prisma/migrations-archive-2026-07-30/` (and in git history).

**Each service has its own `_prisma_migrations` table**, achieved by pinning `?schema=<service>` on
the connection when running migrations — see `scripts/migrate-all.sh`. Without this, services
interfere with each other.

**Verified:** a from-empty build reproduces the live schema exactly — 116 business tables, 26
triggers, 40 check constraints, the exclusion constraint — and all 13 test suites pass against it.

## Day-to-day

```bash
# Change a schema
vim services/<name>/prisma/schema.prisma
npm run prisma:migrate:dev --workspace=services/<name> -- --name what_changed

# Apply pending migrations to a database
DATABASE_URL=... DIRECT_DATABASE_URL=... npm run migrate:all

# Does every service's migrations still reproduce its schema.prisma?
SHADOW_DATABASE_URL=... npm run check:drift
```

CI runs the last two on a throwaway Postgres on every PR, so drift and unbuildable schemas fail the
build rather than being discovered months later.

## ⚠️ The pooler trap

Prisma migrate commands **hang silently** against Supabase's transaction pooler (port **6543**). They
need a session-mode connection (port **5432**).

This is almost certainly why the platform drifted to `db push` in the first place: migrations appear
to freeze, and `db push` is the obvious escape hatch.

Every `schema.prisma` now declares `directUrl = env("DIRECT_DATABASE_URL")`, so Prisma uses the
session connection for migrations while the app keeps using the pooler. Set both in each service's
`.env` — see any `.env.example`. On a plain Postgres they are the same value.

## Two shims that must be removed

Both live in [`../../scripts/sql/000_shared_bootstrap.sql`](../../scripts/sql/000_shared_bootstrap.sql):

1. **`auth.users`** — booking-service LEFT JOINs Supabase's `auth.users` for customer name/email
   fallback. That schema is Supabase-owned and does not exist on plain PostgreSQL **or on Azure
   Database for PostgreSQL**. This makes it a migration blocker, not just a test inconvenience.
   Delete the shim when WO-1.2(a) removes those joins.
2. **`shared.set_updated_at()`** — membership's ten triggers call it. Six other services define an
   identical private copy in their own schema. Worth converging on one approach.

## Things deliberately removed

- **`booking.check_unit_availability()`** — referenced `venue.bookable_unit_conflicts`, a table that
  does not exist (the real one is `venue.unit_conflicts`). Called from no application code, and it
  made the schema unbuildable because Postgres validates function bodies at creation.
- **`membership_participants_person_fk`** → `identity.people` — a cross-schema FK into an orphaned
  schema. Not recreated: a database-level FK between two services physically prevents them living in
  separate regional databases.

## The live database

Re-baselined on 2026-07-31. Each service now has its own `<schema>._prisma_migrations` with its
baseline recorded as applied, and all 14 report **"Database schema is up to date!"**.

The old shared table was renamed to `public._prisma_migrations_pre_20260731` rather than dropped, so
the previous history is still inspectable. Delete it once you are satisfied.

## Still outstanding

- **The three orphaned schemas** (`identity`, `crm`, `customer` — 13 tables between them) still exist
  in the live database. Empty and unreferenced; dropping them is a separate deliberate step.

## Drift: reconciled for 11 of 14, and now a blocking gate

`npm run check:drift` is **blocking in CI** as of 2026-07-31. Any *new* drift fails the build.

**The database was authoritative, not the schema files.** The drift was mostly `timestamptz` columns
that `schema.prisma` declared as bare `DateTime` — which Prisma maps to `TIMESTAMP(3)`, i.e. **no
timezone**. Had we "fixed" the drift the other way and let Prisma rewrite the database, we would have
stripped timezone awareness from a platform whose entire premise is EU/US/AU. The rest was index and
foreign-key naming.

Eleven services were reconciled with `prisma db pull`, giving exactly zero drift.

**Three services could not be** — booking, membership and people, listed in `KNOWN_DRIFT` in
[`../../scripts/check-migration-drift.sh`](../../scripts/check-migration-drift.sh). They declare
relations in `schema.prisma` that have **no foreign key in the database** (people's `personTags`,
`householdMemberships`, `relationshipsFrom`/`To`, and similar). Introspection cannot see a relation
with no FK, so it drops the field — and the code that uses it stops compiling.

Reconciling them means answering a real question per relation: **add the missing foreign key to the
database, or keep it as an application-level relation?** That is design work, not a mechanical fix.
Shrinking `KNOWN_DRIFT` to empty is the remaining task; each name removed is one more service that
can never silently drift again.

### A caveat about `check:drift`

The obvious formulation — `prisma migrate diff --from-migrations ... --shadow-database-url` — does
**not** work here. Prisma's shadow replay mishandles the pg_dump baselines: it fails to register the
`CREATE SCHEMA` and then reports every table as unqualified, producing a full drop-and-recreate diff
for all 14 services. The script instead compares the database that `migrate-all.sh` just built
against each `schema.prisma`, which proves the same property and is cheaper.
