---
description: Full pre-PR gate (branch, kill services, lint, test, review) then open the PR
---

Take the current change from "done coding" to "PR open", safely and consistently.

1. **Branch check** — never open a PR from `main`. If I'm on `main`, create a feature branch
   first (name it from the change). Show `git status`.
2. **Kill running services** — the test run opens DB connections against **remote Supabase**;
   running services exhaust the pool: `npm run kill:services`.
3. **Lint** — `npm run lint`; fix or report.
4. **Test what changed** — run the affected service suites
   (`npm run test --workspace=services/<name>`), or the relevant portal/e2e checks. Get them
   green; do not weaken tests to pass.
5. **Review** — follow the `/review` workflow: dispatch the applicable reviewer agents for the
   changed paths and consolidate findings. **Block** on any High finding.
6. **Commit** if there are uncommitted changes — conventional message, and the repo's
   `Co-Authored-By` trailer.
7. **Open the PR** — only after I confirm. Push the feature branch and `gh pr create` with a
   title and a body that summarises what changed and how it was verified (include the
   `🤖 Generated with [Claude Code]` line). Never push straight to `main`.

Report the branch, test results, review verdict, and the PR URL. Stop and ask if any gate fails.
