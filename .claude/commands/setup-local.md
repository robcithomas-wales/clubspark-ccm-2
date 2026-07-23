---
description: Get this checkout runnable — install deps, wire up .env files, generate Prisma clients
---

Bootstrap this checkout (or fresh worktree) so services can run and tests can pass.

1. **Install** — run `npm install` at the repo root (npm workspaces installs everything).
2. **Environment** — this platform uses **Supabase** (hosted Postgres + JWT auth); there is
   **no local database or docker-compose**. For each `services/<name>` that has a
   `.env.example` but no `.env`, copy the example to `.env`. Then tell me which values I
   must fill in — do **not** invent secrets:
   - `DATABASE_URL` → the Supabase Postgres connection string
   - `SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - Confirm each service's `PORT` matches the port table in `CLAUDE.md`.
3. **Prisma** — run `npm run prisma:generate --workspace=services/<name>` for services whose
   generated client is missing (clients are git-ignored under `**/prisma/generated/`).
4. **Smoke check** — build one service (`npm run build --workspace=services/booking-service`)
   to confirm the toolchain works.

Report what's ready and exactly which env values I still need to provide. Never commit a
real `.env` — only `.env.example` is tracked.
