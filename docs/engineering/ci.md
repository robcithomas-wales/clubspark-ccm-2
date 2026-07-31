# CI & the pre-push hook

> **Status:** Active as of 2026-07-30 · Workflow: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

Gate 1 item G1.0 from [`../roadmap/pilot-to-production.md`](../roadmap/pilot-to-production.md).
Before this, there was no CI at all and the pre-push hook existed only on one machine — nothing
stopped broken code reaching `main` once a second engineer cloned the repo.

## What runs on every PR

| Job | What it does | Blocking |
|---|---|---|
| **Build all services** | `npm ci` → `prisma:generate:all` → `build:services` → `typecheck` | Yes |
| **Lint changed files** | ESLint over the `.ts`/`.tsx` files the PR touches | Yes |
| **Service integration tests** | Every service suite, sequentially, against a real Postgres | Yes |

## Two deliberate design decisions

### 1. Tests fail loudly when there is no database

Every integration suite is wrapped in `describe.runIf(DB_AVAILABLE)`, and `checkDbAvailable()`
swallows connection errors and returns `false`. Locally that is correct — a developer without
credentials still gets a usable `npm test`.

In CI it is dangerous: vitest exits **0** with every file skipped, so the job goes green having
verified nothing. We hit exactly this during development — a run reported "passing" with 8 of 10
spec files silently skipped because the connection pool was exhausted.

So the test job runs [`scripts/ci-require-db.mjs`](../../scripts/ci-require-db.mjs) first. It fails
the job if `DATABASE_URL` is unset, unreachable, or points at a database with none of the expected
service schemas. **A green test job now means tests actually ran.**

### 2. Lint is scoped to changed files

`npm run lint` currently reports ~15,000 problems, overwhelmingly Prettier formatting. Gating on the
whole repo would mean a permanently red build; mass-reformatting would produce an unreviewable diff
that collides with everyone's in-flight work.

Linting only what the PR touches prevents **new** problems without demanding that cleanup first.
When the backlog is cleared, swap the job body for plain `npm run lint`.

## Required repository secrets

Set these under **Settings → Secrets and variables → Actions**:

| Secret | Purpose | Without it |
|---|---|---|
| `DATABASE_URL` | Postgres the suites run against | **Test job fails** (by design) |
| `SUPABASE_URL` | JWKS issuer for auth | Suites use the `NODE_ENV=test` header fallback, so usually fine |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin operations | Only needed by suites that use it |

⚠️ **Use a dedicated CI database, not the shared dev one.** The suites create and delete fixture
rows under fixed tenant ids. Two runs against the same database at once will interfere — we saw
exactly that locally: overlapping runs left orphaned rows and produced failures that looked like
real defects but weren't. The `concurrency` block cancels superseded runs on the same branch, but it
cannot protect you from two different branches running simultaneously.

## Branch protection (set this in the GitHub UI)

CI only helps if it is enforced. On **Settings → Branches → `main`**:

- Require a pull request before merging
- Require status checks to pass: `Build all services`, `Lint changed files`,
  `Service integration tests`
- Require branches to be up to date before merging

Until that is set, the workflow reports results but nothing stops a merge past a red build.

## The pre-push hook

[`scripts/hooks/pre-push`](../../scripts/hooks/pre-push) is committed and installed automatically —
the root `prepare` script points `core.hooksPath` at `scripts/hooks` on `npm install`.

It runs **typecheck + lint on changed files** — fast and deterministic. It deliberately does **not**
run the integration suites.

**Why no tests in the hook.** The suites need a real database, and locally that is the shared
Supabase instance. Running several back-to-back against it is unreliable for reasons unrelated to the
code: they share one pgbouncer connection limit (later suites fail with `Can't reach database`), and
they share fixture rows under fixed tenant ids (a killed run leaves orphans that fail the next one).

We hit both repeatedly during this work — including a push blocked by 7 "failures" in booking and
membership that passed 59/59 when the suite was run on its own moments later. A hook that fails for
environmental reasons is worse than no hook: it took 20+ minutes and made `--no-verify` tempting,
which then skips the checks that *do* work.

CI gets a clean, private Postgres every run, so it has neither problem. That is where the suites
belong. The hook lints exactly what the CI lint job lints, so a green hook means a green lint job.

Emergency override: `git push --no-verify`.

## Known gaps

- **No CI database is provisioned yet.** Until the `DATABASE_URL` secret is set, the test job fails
  by design. That is preferable to a green tick that means nothing, but it does mean CI is not fully
  useful until someone creates a dedicated CI Postgres.
- **The portals and e2e suite are not in CI** — services only, for now.
- **Node 20** in CI versus 24 locally. `engines` says `>=20`, so CI enforces the stated floor. If
  something breaks only on 20, that is a real finding rather than a CI bug.
