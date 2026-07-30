#!/usr/bin/env node
/**
 * Fail the CI job if the test database is not reachable.
 *
 * Why this exists: every integration suite is wrapped in
 * `describe.runIf(DB_AVAILABLE)`, and `checkDbAvailable()` swallows connection
 * errors and returns false. That is the right behaviour locally — a developer
 * without DB credentials still gets a usable `npm test`. In CI it is dangerous:
 * vitest exits 0 with every file skipped, and the job goes green having verified
 * nothing at all.
 *
 * So CI asserts reachability up front and fails loudly instead.
 *
 * Uses booking-service's generated Prisma client rather than adding a root `pg`
 * dependency — run `npm run prisma:generate:all` first (CI does).
 *
 * Usage: node scripts/ci-require-db.mjs
 */
const url = process.env.DATABASE_URL

if (!url) {
  console.error('✗ DATABASE_URL is not set.')
  console.error('  The integration suites need a real Postgres. Set the DATABASE_URL secret')
  console.error('  in the repository settings, or the test job verifies nothing.')
  process.exit(1)
}

const redacted = url.replace(/:\/\/([^:]+):[^@]+@/, '://$1:****@')
console.log(`→ Checking database reachability: ${redacted}`)

let PrismaClient
try {
  ;({ PrismaClient } = await import('../services/booking-service/src/generated/prisma/index.js'))
} catch {
  console.error('✗ Prisma client not generated. Run `npm run prisma:generate:all` first.')
  process.exit(1)
}

const prisma = new PrismaClient({
  datasourceUrl: `${url}?pgbouncer=true&connection_limit=1`,
})

try {
  const rows = await prisma.$queryRaw`
    SELECT current_database()::text AS db,
           (SELECT count(*)::int FROM information_schema.schemata
            WHERE schema_name IN ('booking','venue','people','membership','payment','comms')) AS schemas
  `
  const { db, schemas } = rows[0]
  console.log(`✓ Connected to "${db}" — ${schemas} of 6 expected service schemas present`)

  // A reachable-but-unmigrated database would let the suites run and fail
  // confusingly. Say so plainly here instead.
  if (schemas === 0) {
    console.error('✗ None of the expected service schemas exist — is this database migrated?')
    process.exit(1)
  }
} catch (err) {
  console.error(`✗ Could not reach the database: ${String(err).split('\n')[0]}`)
  console.error('  Failing the job rather than letting the suites skip silently.')
  process.exit(1)
} finally {
  await prisma.$disconnect().catch(() => {})
}
