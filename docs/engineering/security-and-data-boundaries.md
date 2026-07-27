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

## Secrets

Real secret values live **only** in git-ignored files and are never exposed to the browser.

- Store secrets in `services/<name>/.env` or a portal's `.env.local` (both git-ignored).
  Only `.env.example` / `.env.local.example` (with placeholders) are committed.
- **Never** put a secret in a `NEXT_PUBLIC_*` variable — those are inlined into the browser
  bundle. `ANTHROPIC_API_KEY`, service-role keys, and JWT secrets are **server-only**.
- Never paste secrets into commits, logs, system prompts, or agent memory files.
- No cloud deployment yet — the app runs locally, so secrets live only in git-ignored local
  files (`services/<name>/.env`, portals' `.env.local`) plus Supabase for DB creds. When the
  platform deploys to **Azure** (the near-term target), they move to Azure Key Vault. Never
  hand-paste secrets into code.

## Client vs server trust boundary (portals)

- `app/api/**/route.ts` runs **server-side** — safe for secrets, and calls services without
  CORS concerns.
- Code using `NEXT_PUBLIC_*` runs in the **browser** — subject to CORS, and must never carry
  a secret. Browser calls to a service require that service to allow the portal's origin.

## Data boundaries between services

Each service owns its own database schema. A service must not reach directly into another
service's tables — call the owning service's API instead. This keeps schemas independently
migratable and the tenant-scoping logic in one place per domain.
