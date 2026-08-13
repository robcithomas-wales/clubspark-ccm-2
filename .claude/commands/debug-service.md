---
description: Triage a service that won't start or is misbehaving locally
---

Diagnose `services/$1-service` (accept `$1` or `$1-service`). Work through the usual local
failure modes in order and report what you find — don't guess.

1. **Port + health** — find the canonical port in the `CLAUDE.md` port table, then:
   `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/health`
   (or `./scripts/run-all.sh status` for the whole stack). No response → it's not up.
2. **Logs** — the run-all launcher writes per-service logs to `${TMPDIR:-/tmp}/clubspark-run/`.
   Read `$1-service.log` there for the real stack trace / startup error.
3. **Env** — the top local culprits we've actually hit:
   - missing/empty `DATABASE_URL` or other required vars in `services/$1-service/.env`
     (if `.env` is absent or stale, run `npm run check:env`, then `npm run setup:env`);
   - `PORT` in `.env` disagreeing with the canonical port table (causes collisions / "wrong
     port" fetches);
   - Prisma client not generated → `npm run prisma:generate --workspace=services/$1-service`.
   Never print secret values — report *which* var is missing/wrong, not its contents.
4. **Port collision** — check nothing else already holds the port
   (`lsof -i :<port>` / `./scripts/run-all.sh status`).
5. **Portal "Failed to fetch" against this service** — check the calling portal's
   `NEXT_PUBLIC_<NAME>_SERVICE_URL` in its `.env.local` points at the canonical port (a stale
   value here is the classic cause), and that the service is actually up (steps 1–2).
6. **Build** — if it starts but behaves oddly, confirm it's built from current source:
   `npm run build --workspace=services/$1-service`.

Report the root cause and the exact fix. If it's a code bug, point to `file:line`; if it's env,
say which var to set (not the value).
