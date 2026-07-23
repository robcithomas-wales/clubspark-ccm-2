---
description: Run (and fix) a service's test suite the safe way
argument-hint: <service-name>
---

Run the test suite for `services/$1` and get it green.

1. Make sure no dev services are running that would exhaust the DB pool
   (`pkill -f "nest start"` / `pkill -f "node dist/main.js"` if needed).
2. Run `npm run test --workspace=services/$1` (vitest).
3. If anything fails, read the failing test and the code under test, fix the root cause
   (not the assertion, unless the assertion is genuinely wrong), and re-run until green.
4. Report what failed and what you changed. Do not weaken or delete tests to pass.
