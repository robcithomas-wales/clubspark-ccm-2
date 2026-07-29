---
description: Scaffold a new blueprint-compliant NestJS service and register it platform-wide
argument-hint: <name> <port> [schema]
---

Scaffold a new blueprint-compliant NestJS service called `$1` on port `$2` (schema `$3`,
defaults to `$1`).

Follow this exactly — the scripts do the mechanical work; you verify and finish the wiring:

1. **Pick a free port** if `$2` is missing or looks taken. Check the port table in `CLAUDE.md`
   and the `SERVICES=` line in `scripts/run-all.sh`. The convention is the next free `40xx`.
2. **Scaffold** from the `template-service` skeleton and auto-register the service:
   ```
   ./scripts/new-service.sh $1 $2 $3
   ```
   This clones the standard service shape, renames tokens, and registers the service in
   `scripts/run-all.sh`, `build:services` (package.json), and the `CLAUDE.md` port table.
3. **Verify blueprint compliance** — this is the gate, it must be green:
   ```
   ./scripts/check-service.sh $1
   ```
   Fix anything it flags (`✗`). Add the `CLAUDE.md` port-table row by hand if the best-effort
   edit missed it.
4. **Install + generate + build**:
   ```
   npm install
   npm run prisma:generate --workspace=services/$1-service
   npm run build --workspace=services/$1-service
   ```
5. **Define the domain** — set the schema namespace and models in
   `services/$1-service/prisma/schema.prisma`, then build the modules (controller → service →
   repository, URI-versioned, `@IsString()`/`@IsNotEmpty()` id validation). Mirror an existing
   domain service (e.g. `venue-service`) for structure.
6. **Update the architecture record in the same change** — a new service evolves the
   architecture, so reflect it in `docs/architecture/platform-architecture.md` (service table +
   responsibilities) per `architecture-principles.md`.
7. Hand off to `@architecture-reviewer` and `@service-reviewer` before opening a PR.

Do NOT hand-edit the registration files first — run the scaffolder, then let `check-service.sh`
tell you what (if anything) is still missing.
