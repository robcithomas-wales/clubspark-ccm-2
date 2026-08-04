# `@clubspark/auth`

Authentication for every ClubSpark service: JWT verification, tenant context, and
service-to-service auth. One implementation, imported by all 15 services.

## Why it exists

Each service used to carry its own copy of `tenant-context.guard.ts`. Fifteen copies
became **six different implementations**, and the differences were not deliberate:

- Two services' guards had **no `Reflector`**, so `@SkipTenant()` was silently inert
  in them. Their health probes only worked because of a separate hard-coded `/health`
  path check. Applying the decorator to any other route there would have produced a
  confusing 401 that looked like a config problem.
- Two put `userId` in the tenant context; thirteen did not — so anything needing "who
  did this" had to re-parse the token.
- One logged JWT verification failures to `console.error`; the rest discarded them,
  which made "why is this token rejected?" unanswerable in the other fourteen.

More importantly: replacing Supabase with Azure Entra External ID meant editing
fifteen files and hoping they stayed consistent. Now it is one line, in one place,
per service.

## Usage

```ts
import { AuthModule, supabaseAuth } from '@clubspark/auth'

@Module({
  imports: [
    AuthModule.forRoot(supabaseAuth()),
    ConfigModule.forRoot({ isGlobal: true, /* ... */ }),
    // ...
  ],
})
export class AppModule {}
```

`forRoot()` registers `TenantContextGuard` as a global `APP_GUARD`, so **every route
is authenticated unless it opts out**. That default matters: leaving registration to
each service means one forgotten line silently exposes everything it serves.

Exempt a route with the decorator, which works everywhere:

```ts
import { SkipTenant } from '@clubspark/auth'

@Controller('health')
@SkipTenant()
export class HealthController {}
```

Protect a service-to-service route:

```ts
import { InternalSecretGuard, SkipTenant } from '@clubspark/auth'

@Post('internal/batch')
@SkipTenant()                      // no end-user JWT exists on this call
@UseGuards(InternalSecretGuard)    // ...so this is the ONLY authenticator
```

## Switching identity provider

This is the whole point of the package. Each service changes one line:

```ts
- AuthModule.forRoot(supabaseAuth())
+ AuthModule.forRoot(entraAuth({ tenantId: process.env.AZURE_TENANT_ID!, audience: '...' }))
```

No guard, controller, or service is aware of which provider issued the token. Both
presets are in [`src/presets.ts`](src/presets.ts); a provider that neither fits is a
`jwks` config plus a `claims` mapper.

⚠️ **Entra will not emit `tenantId`/`organisationId` by default.** They must be added
as optional claims / a claims-mapping policy on the app registration. Until they are,
every request fails with *"Token is missing tenantId claim"* — that is the expected
first failure when wiring Entra up, not a bug in the guard.

## Behaviour worth knowing

**Header auth is fail-closed.** `x-tenant-id` is a convenience for integration tests
and local dev. It is enabled only when `NODE_ENV` is exactly `test` or `development` —
an allowlist, not `!== 'production'`, so an unset or misspelled `NODE_ENV` refuses
rather than opens. Trusting that header in production would let any caller read any
tenant's data.

**`InternalSecretGuard` does *not* relax in development.** `run-all.sh` sets
`NODE_ENV=development`, and these routes have no other authenticator, so a dev bypass
would leave bulk-mutation endpoints open on every developer machine. It opens only
under `NODE_ENV=test`.

**`INTERNAL_SECRET` must be byte-identical across all services.** A mismatch fails
quietly: cross-service calls and domain events 401 and the rejection is discarded.

**`userId` is optional, and absent means unknown.** Do not substitute a placeholder.
Two services used to default it to the string `'test-user'`; the first service to
persist that value hit a `uuid` column and every write 500'd. If a route genuinely
needs to know who is calling, reject when it is missing — see `actingUserId()` in
admin-service.

**JWKS config is resolved lazily.** `AuthModule.forRoot(...)` is evaluated inside the
`imports: [...]` array, which runs *before* `ConfigModule.forRoot()` loads `.env`.
Reading `process.env` eagerly sees nothing and the service fails to boot, so
`jwks` accepts a thunk and the presets use one.

## Tests

```bash
npm run test --workspace=packages/auth
```

No database, no network — the verifier is stubbed. They run in well under a second
and cover the fail-closed paths directly, rather than only through a service suite.
