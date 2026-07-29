---
description: Run the right reviewer agents for what changed, before opening a PR
---

Review the current change with the correct specialist agents. Target: `$1` if given
(a path, service, or "the diff"); otherwise review the working-tree changes.

1. **Scope it** — run `git status` / `git diff --stat` (or inspect `$1`) to see what changed.
2. **Dispatch by path — only the reviewers that apply:**
   - `services/*` (controllers/services/repositories/DTOs/config) → `@service-reviewer`
   - `*-portal/` (admin/customer/internal Next.js) → `@portal-reviewer`
   - anything touching **auth, tenant scoping, secrets, data access, `$queryRaw`, env** → `@security-reviewer`
   - **structural** change (new service, cross-service call, moving code between layers, new
     event) → `@architecture-reviewer` (it runs `./scripts/check-service.sh` as its first pass)
   - a change that implements/alters a **spec'd feature** (something in `docs/specs/`) →
     `@product-reviewer`
   Launch the applicable reviewers **in parallel** (independent, read-only).
3. **Consolidate** — merge their findings into one list, most-severe first, de-duplicated. For
   each: severity, `file:line`, the rule/spec it breaks, the consequence, and the fix.
4. **Recommend** — state clearly whether this is good to open a PR, or what must change first.

Don't fix anything in this command — review only. If nothing changed, say so rather than
inventing findings.
