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

## Shared bootstrap compatibility

The shared bootstrap lives in
[`../../scripts/sql/000_shared_bootstrap.sql`](../../scripts/sql/000_shared_bootstrap.sql):

1. ✅ **`auth.users` shim removed.** Booking no longer reads Supabase-owned `auth.users`; customer
   display fields come from the tenant-scoped People API. Empty-database builds therefore do not
   need an `auth` schema.
2. **`shared.set_updated_at()` remains** — membership's ten triggers call it. Six other services define an
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

## Drift: reconciled for all 14, and now a blocking gate

`npm run check:drift` is **blocking in CI** as of 2026-07-31. Any _new_ drift fails the build.

**The database was authoritative, not the schema files.** The drift was mostly `timestamptz` columns
that `schema.prisma` declared as bare `DateTime` — which Prisma maps to `TIMESTAMP(3)`, i.e. **no
timezone**. Had we "fixed" the drift the other way and let Prisma rewrite the database, we would have
stripped timezone awareness from a platform whose entire premise is EU/US/AU. The rest was index and
foreign-key naming.

Eleven services were reconciled with `prisma db pull`, giving exactly zero drift.

**Three could not be, and now are.** booking, membership and people declared relations in
`schema.prisma` with **no foreign key in the database** (people's `personTags`,
`householdMemberships`, `relationshipsFrom`/`To`, and similar). Introspection cannot see a relation
with no FK, so `db pull` dropped the field and the code stopped compiling — which is why those three
sat in a `KNOWN_DRIFT` allowlist rather than being fixed.

Resolving it meant answering, per relation, **add the missing foreign key, or keep the relation
application-level?** The answer was to add them: 15 keys across the three services
(`20260804000000_add_missing_foreign_keys`). They are all _intra_-schema, so they cost nothing in
regional terms, and the pilot had no meaningful data to reconcile — this gets materially harder once
there are customers.

**`KNOWN_DRIFT` is now empty, and all 14 services are clean.** Keep it that way: while the list held
three names it also masked the outbox tables being absent from `schema.prisma`, and only the one
service _not_ on the list failed the build.

Three things fell out of doing this, each worth knowing:

- **Adding FKs surfaced a latent bug.** With the relations visible, introspection also corrected four
  membership columns from nullable to `NOT NULL` — matching the database, which had always been
  `NOT NULL`. The code wrote `?? null` into them. It had never failed only because those paths were
  untested; `schema.prisma` being wrong is what hid it from the compiler.
- **Deduplicate constraints by table+column, not by name.** The first pass filtered existing keys by
  constraint _name_; four relations already had one under a hand-written `_fk` name, so it added a
  second identical constraint to each. Both were enforced — nothing was unprotected — but Prisma
  expects exactly one per relation, so it read as permanent, unfixable drift.
- **Never edit a migration that has already been applied.** Those four drops were first appended to
  the migration that caused them, which had already run against Supabase — so live would never have
  received them. They belong in `20260804010000_drop_legacy_and_orphan_fks`, a new migration, written
  entirely with `DROP CONSTRAINT IF EXISTS` so it is a no-op on a database built from scratch.

That last migration also drops `membership_participants.person_id -> identity.people`: a
**cross-schema** foreign key, applied by hand, in no migration file, pointing into one of the three
orphaned schemas. It had only ever validated because both tables are empty. Live and a from-scratch
build now produce an identical set of 98 service foreign keys, with **zero cross-schema keys** in any
service schema.

### A caveat about `check:drift`

The obvious formulation — `prisma migrate diff --from-migrations ... --shadow-database-url` — does
**not** work here. Prisma's shadow replay mishandles the pg_dump baselines: it fails to register the
`CREATE SCHEMA` and then reports every table as unqualified, producing a full drop-and-recreate diff
for all 14 services. The script instead compares the database that `migrate-all.sh` just built
against each `schema.prisma`, which proves the same property and is cheaper.
