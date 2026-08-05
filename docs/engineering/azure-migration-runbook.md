# Azure migration runbook — leaving Supabase

> **Status:** Ready to execute when environments exist · **Created:** 2026-08-05
> **Scope:** replacing Supabase with Azure for **both** Postgres and Auth.
> **Target shape:** [`../architecture/azure-aks-reference-architecture.md`](../architecture/azure-aks-reference-architecture.md)

Everything here is verified against the codebase and live database on 2026-08-05, not assumed.

## The headline

**Supabase is used for exactly two things: Postgres hosting and Auth.** Verified — there is no
Supabase Storage, no Realtime, no Edge Functions, no RLS policy, and no `auth.uid()` / `auth.jwt()`
anywhere in the migrations. That is a much narrower coupling than a typical Supabase application,
and it means the migration is two independent workstreams.

| | Where the work is |
|---|---|
| **Postgres** | Provisioning and cutover. The repository already builds its own schema from empty and CI proves it every PR, so there is nothing to reverse-engineer. |
| **Auth — backend** | ✅ Effectively done. One line per service. |
| **Auth — front-ends** | ❌ **This is the real work.** Four apps still call the Supabase SDK directly. |

## Part 1 — Postgres

### What is already true

`npm run migrate:all` builds the entire schema into an empty database, and `npm run check:drift`
proves the result matches all 14 `schema.prisma` files. CI does both on a throwaway Postgres 17
container every PR. Standing up an Azure database is therefore "run the migrations", not a data
archaeology exercise — which was not true before 30 July.

The `auth.users` shim is gone (MR-1). booking-service used to `LEFT JOIN` Supabase's `auth` schema,
which **does not exist on Azure Database for PostgreSQL** — that alone would have stopped the
platform running on the target.

### ⚠️ `btree_gist` must be allow-listed before the migrations will run

`scripts/sql/000_shared_bootstrap.sql` does `CREATE EXTENSION IF NOT EXISTS btree_gist`. It is the
only extension the platform needs, and it is not optional: booking-service's
`no_overlapping_active_bookings` exclusion constraint — the atomic double-booking guard — cannot be
created without it.

Azure Database for PostgreSQL Flexible Server does not allow arbitrary extensions. `btree_gist` must
be added to the **`azure.extensions`** server parameter *before* running migrations, and that change
requires a server restart. Confirm the parameter name against current Azure docs at provisioning
time — Microsoft has renamed it before.

Failure mode if skipped: `migrate-all.sh` fails on the first service, with an error about the
extension rather than about the constraint, which is a confusing place to start.

### Connection strings

Two are needed per service, and they must differ:

- `DATABASE_URL` — pooled, for the application.
- `DIRECT_DATABASE_URL` — a **session** connection, for migrations.

This is not a Supabase quirk to leave behind. Prisma's migration engine needs session-level
connections and hangs on a transaction pooler — on Supabase that is port 6543 vs 5432; on Azure
Flexible Server it is the built-in PgBouncer port vs the direct one. The `directUrl` declaration in
all 15 `schema.prisma` files stays exactly as it is; only the host changes.

Each service also pins `?schema=<its schema>` so it gets its own `_prisma_migrations` table. Keep
that: sharing one migrations table across 15 services is what produced the P3009 cascades in July.

### Cutover

The pilot has no meaningful data, so **do not migrate data — rebuild**. That is the standing
instruction and it removes the entire class of dump/restore risk.

1. Provision Flexible Server; set `azure.extensions` to include `btree_gist`; restart.
2. Point `DATABASE_URL` / `DIRECT_DATABASE_URL` at it.
3. `npm run migrate:all` then `npm run check:drift` — expect `clean: 14  new drift: 0`.
4. Run the suites against it: `npm run test:services` — expect 14 passed, 2 skipped.
5. Seed.

Step 3 failing is the signal that something about the target differs from plain Postgres. That is
precisely what the drift gate is for.

## Part 2 — Auth

### Backend: done

`@clubspark/auth` ([`../../packages/auth/README.md`](../../packages/auth/README.md)) is the only
code that knows an identity provider exists. Each service changes one line:

```ts
- AuthModule.forRoot(supabaseAuth())
+ AuthModule.forRoot(entraAuth({ tenantId: process.env.AZURE_TENANT_ID!, audience: '<api-app-id>' }))
```

`entraAuth()` already exists. No guard, controller, repository or service is aware of the provider.

**⚠️ The claims are the catch, and they are not a code change.** Entra does not emit `tenantId`,
`organisationId` or `homeRegion` by default. They must be added as optional claims / a
claims-mapping policy on the app registration. Until that is done, every request fails with
*"Token is missing tenantId claim"* — expect this as the first failure, and do not go looking for a
bug in the guard.

`entraAuth()` reads them with an `extension_` prefix by default (`extension_tenantId`), overridable
via `claimPrefix`. It also prefers the `oid` claim over `sub` for user identity: `sub` is pairwise
per application in Entra, so the same person gets different `sub` values in different services,
while `oid` is stable.

Two leftovers to remove during the swap: `SUPABASE_SERVICE_ROLE_KEY` is read directly in
`venue-service/src/venues/venues.controller.ts:133` and
`organisations.controller.ts:83` — the last privileged Supabase key in the backend.

### Front-ends: this is the actual work

Four applications authenticate through `@supabase/supabase-js` and `@supabase/ssr` directly:

| App | SDK boundary files |
|---|---|
| admin-portal | `proxy.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts` |
| customer-portal | `middleware.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts` |
| internal-portal | `middleware.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts` |
| mobile-app | `lib/supabase.ts`, `contexts/AuthContext.tsx` |

11 files construct the client — good, it is already centralised. But **176 files reference Supabase
and 168 call `getSession()` / `getUser()`**, almost all of them fetching an access token to attach
to an API call. Those are the migration surface, and every new page adds more.

The concentration matters for planning:

| App | Files referencing Supabase | Session calls |
|---|---|---|
| admin-portal | 140 of 405 | 141 across 135 files |
| customer-portal | 16 of 34 | 13 across 12 files |
| internal-portal | 16 of 26 | 11 across 11 files |
| mobile-app | 4 of 24 | 3 across 2 files |

**admin-portal is 84% of the work** — one call site per page, near enough. The other three are an
afternoon each.

**Recommendation, and the one piece of this worth doing before environments exist:** put a thin
session facade in each app now — `getAccessToken()`, `getCurrentUser()`, `signIn()`, `signOut()` —
and move the 168 call sites onto it. It is mechanical, it can be done and shipped today against
Supabase with no behaviour change, and it turns the eventual Entra swap into rewriting 11 files
instead of 176.

This is the same move that made the backend a one-line change, applied to the front-ends. Doing it
before the swap rather than during it means the risky change and the boring change are not landing
at once.

Also note `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_URL` are baked into client
bundles, so every portal needs rebuilding and redeploying at cutover — this is not a config-only
switch for the front-ends.

## Part 3 — Secrets

Secrets live today only in git-ignored `.env` / `.env.local` files. On Azure they belong in **Key
Vault**, surfaced to AKS via Workload Identity and the Secrets Store CSI driver.

Two that need care:

- **`INTERNAL_SECRET` must be byte-identical across all 15 services.** A mismatch does not fail
  loudly — cross-service calls and every domain event 401 quietly and the rejection is discarded.
  One Key Vault secret referenced by all 15 workloads, never 15 separately-managed values.
- **`CLUBSPARK_REGION` must be set per deployment**, and is intentionally *not* defaulted in
  production: a service that cannot determine its region refuses to start. That is deliberate —
  see [`../architecture/data-classification.md`](../architecture/data-classification.md).

## Order

1. **Session facade in the four front-ends** — do now, no Azure dependency, shrinks the risky step.
2. **Postgres** — independent of auth; provision, migrate, verify with the drift gate, cut over.
3. **Entra app registration + claims mapping** — the long pole, because it is Azure configuration
   rather than code, and nothing can be tested end-to-end until the claims arrive.
4. **Flip `supabaseAuth()` → `entraAuth()`**, swap the front-end facade implementations, remove the
   two `SUPABASE_SERVICE_ROLE_KEY` uses, drop the `@supabase/*` dependencies.

1 and 2 are independent and can run in parallel. 4 is small once 3 is right.

## What this does not cover

AKS topology, Front Door, API Management, Service Bus and observability — those are the reference
architecture documents, and they are a deployment concern rather than a migration one. This runbook
is only "how do we stop depending on Supabase".
