---
description: Add a Next.js portal page/feature following the portal conventions
---

Add **$2** to the `$1` portal (one of `admin-portal`, `customer-portal`, `internal-portal`).
Match the existing app structure and the platform's client/server rules.

1. **Read neighbours first** — open a comparable page in `$1/app/` and mirror its structure
   (App Router layout, server vs client components, data-fetch location, shared UI components).
2. **Service URLs from env, never hard-coded** — call backend services via
   `NEXT_PUBLIC_<NAME>_SERVICE_URL` (see the values already used in `$1`). Confirm the target
   service's port matches the `CLAUDE.md` port table.
3. **Client vs server boundary** — do data fetching in server components / route handlers where
   the pattern does; only mark a component `"use client"` when it genuinely needs interactivity.
   **Never** put secrets or service-role keys in client code — only `NEXT_PUBLIC_*` values are
   allowed to reach the browser.
4. **Auth & tenant** — carry the Supabase session/JWT and tenant/org context the same way sibling
   pages do; don't invent a new auth path.
5. **Build it** — `npm run build --workspace=$1` (or the portal's own build for
   customer/internal) and fix type/lint errors.
6. Hand to `@portal-reviewer` before a PR (service-URL config, client/server split, secret-safety).

Report the routes/components added and any new `NEXT_PUBLIC_*` env vars I need to set locally.
