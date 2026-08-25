# Security & Data Boundaries

Rules for keeping tenant data isolated and secrets out of the wrong places on the ClubSpark
platform. The `security-reviewer` agent enforces these; this doc is the source of truth.

## Multi-tenancy (the #1 rule)

The platform is multi-tenant. **Every query that reads or writes tenant data must be scoped
by `tenant_id`** (and `organisation_id` where the data is org-scoped).

- Prisma: include `where: { tenantId }` on every read/update/delete of tenant data. A list
  endpoint with no tenant filter is a data-leak bug, not a style issue.
- Raw SQL / cross-schema queries: scope by tenant explicitly — no exceptions.
- Tenant context arrives as a **Supabase JWT** (claims) and/or the `x-tenant-id` /
  `x-organisation-id` headers for service-to-service calls. Endpoints must derive the tenant
  from the request, never trust a tenant id in a request *body*.
- When testing locally, use the seed `TEST_*` tenant/org ids from the service's fixtures.

Failure mode to prevent: *tenant B can read or mutate tenant A's rows.*

### Patterns that keep isolation intact (from the 2026-07 security audit)

- **Verify-first for id-addressed operations.** Any read/update/delete that takes a record
  `id` from the URL/body must either scope the write itself (`updateMany({ where: { id,
  tenantId } })`) or first load the record tenant-scoped and 404 if it isn't the caller's.
  Operating on a bare `id` is an IDOR (Insecure Direct Object Reference).
- **Org-scoped endpoints must verify org ownership.** Never trust an `organisationId` from the
  URL/body — confirm it belongs to the caller's `tenantId` (add `tenantId` to the query, or
  pre-check and reject with 403). Globally-unique keys are the classic trap: an upsert keyed on
  `organisationId` alone can silently hit another tenant's row.
- **Nested resources with no `tenant_id` column** (e.g. competition entries / matches, webhook
  deliveries) are scoped via their parent: load the parent tenant-scoped first and 404 before
  touching the child.

## Secrets

Real secret values live **only** in git-ignored files and are never exposed to the browser.

- Store secrets in `services/<name>/.env` or a portal's `.env.local` (both git-ignored).
  Only `.env.example` / `.env.local.example` (with placeholders) are committed.
- **Never** put a secret in a `NEXT_PUBLIC_*` variable — those are inlined into the browser
  bundle. `ANTHROPIC_API_KEY`, service-role keys, and JWT secrets are **server-only**.
- Never paste secrets into commits, logs, system prompts, or agent memory files.
- **Encrypt sensitive credentials at rest.** Payment-gateway secret keys, OAuth tokens, and
  the like must be stored encrypted (AES-256-GCM — see the `token-encryption.ts` helper), not
  as plaintext in a DB/JSON column, and decrypted only at the point of use. API responses must
  redact them.
- **Secret checks fail closed.** Any code that reads a secret/HMAC key for auth (API-key hash,
  OAuth-state signature, internal secret) must reject when the secret is unset — never fall
  back to an empty/default key in production.
- No cloud deployment yet — the app runs locally, so secrets live only in git-ignored local
  files (`services/<name>/.env`, portals' `.env.local`) plus Supabase for DB creds. When the
  platform deploys to **Azure** (the near-term target), they move to Azure Key Vault. Never
  hand-paste secrets into code.

## Client vs server trust boundary (portals)

- `app/api/**/route.ts` runs **server-side** — safe for secrets, and calls services without
  CORS concerns.
- Code using `NEXT_PUBLIC_*` runs in the **browser** — subject to CORS, and must never carry
  a secret. Browser calls to a service require that service to allow the portal's origin.

## Raw SQL

Never build SQL by string-interpolating request input — it's both an injection hole and a way
to defeat the `tenant_id` filter. Use parameterized `$queryRaw` tagged templates (Prisma binds
`${value}` safely; cast ids with `::uuid`). `$queryRawUnsafe` is acceptable only for a fragment
assembled from an allow-list of constants, with every value passed as a bound parameter — never
request-supplied strings.

## Internal / service-to-service endpoints

Endpoints that skip the tenant guard because another service calls them (event-bus
`/v1/events/inbound`, internal admin endpoints) must be gated by a shared secret:

- Require header `X-Internal-Secret` to equal `INTERNAL_SECRET` — the platform convention
  (see admin-service `InternalGuard`, integration-service `InternalSecretGuard`).
- **Fail closed in production:** if `INTERNAL_SECRET` is unset, reject — allow only when
  `NODE_ENV` is `test`/`development`. The same rule governs the `TenantContextGuard`'s
  `x-tenant-id` header fallback: enabled in test/dev, never in production.
- Such endpoints may read `tenantId` from the event body (inherent to internal delivery) — the
  shared secret is what authorises the call, not the tenant guard.
- Durable event consumers must claim an event idempotently in their own tenant-scoped inbox before
  applying side effects. Persist the payload hash and operational metadata needed for duplicate or
  conflict detection; do not duplicate personal event payloads into inbox audit rows.

## Data boundaries between services

Each service owns its own database schema. A service must not reach directly into another
service's tables — call the owning service's API instead. This keeps schemas independently
migratable and the tenant-scoping logic in one place per domain.
