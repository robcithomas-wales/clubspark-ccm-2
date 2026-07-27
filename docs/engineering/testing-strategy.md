# Testing Strategy

How the ClubSpark platform is tested, and the constraints that shape it. The `test-author`
agent and the `test:services` script follow this.

## Layers

| Layer | Where | Tool | Covers |
|---|---|---|---|
| Service integration tests | `services/*/test/*.spec.ts` | vitest | Service logic + data access against the real DB |
| End-to-end | `e2e/tests/*.spec.ts` | Playwright | Admin portal user flows in a browser |

Front-end apps have **no unit tests** — their functional coverage is the e2e suite. Validate a
portal with `lint`, `build` (type errors), and e2e.

## The hard constraint: a small remote DB pool

There is **no local database** — tests run against **remote Supabase** through a pgbouncer pool
with a low connection limit. This drives two rules:

1. **Kill running services before testing** — a running stack holds connections that exhaust the
   pool and cause flaky failures. `npm run test:services` does this for you.
2. **Run service suites sequentially, not in parallel** — one service at a time; keep each
   suite's `connection_limit` low.

## Service tests

- Seed with the shared `test/helpers` + `test/fixtures`: dedicated `TEST_*` ids and
  `INSERT ... ON CONFLICT DO NOTHING` so re-runs are idempotent and safe against the pilot DB.
- `beforeAll` calls `checkDbAvailable()` — if the DB is unreachable the suite **skips** rather
  than reporting false failures.
- Assert on status codes, **tenant scoping**, and returned data. Never weaken an assertion to
  go green.
- Run one service: `npm run test --workspace=services/<name>`. Run all (pool-safe, sequential):
  `npm run test:services`.

## End-to-end (Playwright)

- Lives in `e2e/`. `global-setup.ts` logs in with `E2E_EMAIL` / `E2E_PASSWORD` (from `e2e/.env`)
  and warms up routes.
- Targets the admin portal via `ADMIN_PORTAL_PORT` — run with `npm run e2e` (which sets it to
  3005). The **stack must be running** first (`./scripts/run-all.sh start`).
