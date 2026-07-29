---
description: Safely evolve a service's Prisma schema — edit, generate, migrate, test
---

Change the Prisma schema for `services/$1-service` (accept either `$1` or `$1-service`) and
keep the generated client and DB in step. Requirement: **$2** (what to add/change).

1. **Read first** — open `services/$1-service/prisma/schema.prisma` and match its existing
   style: the schema is namespaced (`@@schema("<name>")`), ids follow this repo's conventions,
   and this service is the **sole writer** of its schema (no cross-schema writes — call the
   owning service instead).
2. **Edit the schema** to implement `$2`. Keep models in the service's own schema namespace.
3. **Regenerate the client** (git-ignored, must be regenerated after any schema edit):
   `npm run prisma:generate --workspace=services/$1-service`
4. **Migrate** against Supabase — this hits the **remote** DB, so make sure no dev services are
   running that would exhaust the pool first (`npm run kill:services`):
   `npm run prisma:migrate:dev --workspace=services/$1-service`
   Give the migration a clear name describing `$2`.
5. **Build + test** the service to catch breaks from the new client types:
   `npm run build --workspace=services/$1-service` then
   `npm run test --workspace=services/$1-service`
6. **Report** the schema diff, the migration name, and test results. If a repository/service now
   needs to use the new fields, say so — but don't scope-creep beyond `$2` without asking.

Never edit generated client files by hand, and never point a migration at anything other than the
service's own Supabase `DATABASE_URL`.
