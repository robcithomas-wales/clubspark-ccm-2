# Architecture Principles & Invariants

The **enforceable** architecture rules for the ClubSpark platform — the baseline the
`architecture-reviewer` agent checks changes against. The full narrative (target design,
service responsibilities, domain model, diagrams) lives in
[`../architecture/platform-architecture.md`](../architecture/platform-architecture.md); this
file is the tight, rule-based version: each item is something a change could *break*.

## Design principles (from platform-architecture.md §1)

1. **Performance by design** — caching, indexing, atomic operations, async events are not afterthoughts.
2. **Scalability by default** — stateless services, connection pooling, horizontal scaling.
3. **Module independence** — booking works without membership; membership without booking; etc.
4. **Multi-sport from the start** — no specific sport hard-coded into the domain model.
5. **Coaching-ready** — booking primitives support coaching sessions/programmes without redesign.
6. **Azure-native target** — every infra choice has a clean Azure equivalent (see §8 of the narrative).

## Structural invariants (a change must not break these)

1. **One service = one bounded context = one DB schema.** Each service owns its Postgres schema
   (`<name>.*`) and is the sole **writer** of it. A service must not read or write another
   service's tables — call the owning service's HTTP API instead.
   - *Documented exception:* analytics/reporting may do **read-only** cross-schema SQL for
     aggregation (e.g. `analytics-service` member scoring). New cross-schema access **outside
     read-only reporting** is a red flag.
2. **Layering:** controller → service → repository. Controllers stay thin (routing, validation,
   response shaping); business logic lives in the service; all data access lives in the
   repository/Prisma layer. No Prisma in controllers; no business logic in repositories.
3. **Cross-service communication is explicit** — via the event bus (currently HTTP fan-out in
   each service's `src/event-bus/`) or a documented API call. **Never** a shared database, and
   never an in-process dependency between two services.
   - Internal / service-to-service HTTP endpoints (event-bus `/v1/events/inbound`, internal
     admin routes) are authenticated with the shared `INTERNAL_SECRET` (`X-Internal-Secret`),
     fail-closed in production. A new `@SkipTenant` cross-service endpoint that isn't secret-
     gated is a structural break. (Detail: `security-and-data-boundaries.md`.)
4. **Multi-tenancy is structural** — tenant/organisation context comes from the Supabase JWT /
   `x-tenant-id` headers and scopes every tenant-data query. (Query-level detail is enforced by
   `security-reviewer`; the *reviewer here* flags structural breaks — e.g. a new global table.)
5. **Cloud portability** — services talk to Postgres only via **Prisma / `pg`**, never the
   Supabase client SDK, and read all config from env vars. This keeps Supabase → Azure a config
   change, not a code change.
6. **Statelessness** — no per-request state held in service memory that would break horizontal
   scaling; shared/persistent state goes to the DB (or the cache layer once added).
7. **Standard service shape** — a new service mirrors the existing NestJS layout (`config/`,
   `prisma/`, `common/` guards+filters+interceptors, `health/`, URI-versioned controllers) and is
   registered everywhere it must be: the canonical port table in `CLAUDE.md`, `build:services`,
   and `scripts/run-all.sh`. This is **mechanically enforced** by `./scripts/check-service.sh`
   (run `--all` or `<name>`), which also verifies the fail-closed tenant guard and cwd-independent
   env loading; scaffold new services with `./scripts/new-service.sh` (or `/new-service`) so they
   start compliant.

## Keeping the record honest

If a change legitimately **evolves** the architecture (adds a service, a new cross-service
interaction, or alters a boundary), the recorded architecture must move with it **in the same
PR**: update `platform-architecture.md` (service table / responsibilities / diagram) and this
file. A stale architecture doc silently misleads every future review — that is the failure mode
this pair of files exists to prevent.
