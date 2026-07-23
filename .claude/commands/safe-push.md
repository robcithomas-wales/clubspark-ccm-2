---
description: Prepare the branch for push (lint, kill services, test) then push
---

Get the current branch ready to push, following this repo's rules:

1. **Kill running services first** — pre-push hooks run tests that open DB connections;
   running services exhaust the pool and cause flaky failures:
   `pkill -f "nest start"` and `pkill -f "node dist/main.js"`.
2. Run `npm run lint` and fix or report issues.
3. Run the relevant service test suites for what changed.
4. Show me `git status` and a concise diff summary.
5. Only push if I confirm, and only to a feature branch (never straight to `main`).
