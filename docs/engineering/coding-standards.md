# Coding Standards

Conventions for the ClubSpark platform. `CLAUDE.md` carries the short version loaded every
session; this is the fuller reference. The `service-reviewer` agent enforces the service rules.

## Services (NestJS)

- **Layering:** controllers stay thin (routing, validation, response shaping); business logic
  lives in the service; all data access lives in the repository/Prisma layer. Never query Prisma
  from a controller.
- **DTO validation:** use `class-validator`. For id fields use `@IsString()` + `@IsNotEmpty()` —
  **never `@IsUUID()`** (ids are validated as non-empty strings across this codebase).
- **API versioning:** URI-based (`enableVersioning({ type: VersioningType.URI })`).
- **Swagger:** annotate new endpoints so they appear in the non-production Swagger docs.
- **ESM imports:** relative imports use explicit `.js` extensions (e.g. `./app.module.js`),
  compiled to CommonJS. Match the surrounding style.
- **Config / env:** each service loads its own `.env` via a cwd-independent
  `envFilePath: join(__dirname, '..', '.env')` in `ConfigModule.forRoot` — so it runs correctly
  regardless of the working directory it's launched from.
- **Ports:** each service has a canonical port (see the table in `CLAUDE.md`). Don't reuse one.

## Prisma

- The client is generated (git-ignored under `**/prisma/generated/` and `**/src/generated/`) —
  run `prisma:generate` after install or a schema change (`npm run prisma:generate:all`).
- Schema changes ship with a migration. Each service owns its own schema.

## Multi-tenancy & secrets

Scope every tenant query by `tenant_id`; keep secrets server-side and out of `NEXT_PUBLIC_*`.
See `security-and-data-boundaries.md` for the full rules.

## Front-ends (Next.js)

- Server-side data access goes through `app/api/**/route.ts`; browser-side fetches use
  `NEXT_PUBLIC_*_SERVICE_URL` (canonical ports) and never carry secrets.
- Fail safe on upstream errors — friendly user message, real error logged server-side.

## Tooling & workflow

- Build all services: `npm run build:services`. Run the stack: `./scripts/run-all.sh start`.
- Kill services before tests/push: `npm run kill:services`. Test all: `npm run test:services`.
- See `docs/agentic-engineering.md` for the agentic workflow and `testing-strategy.md` for tests.
