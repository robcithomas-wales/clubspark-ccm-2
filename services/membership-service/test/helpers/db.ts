import 'dotenv/config'
import { PrismaClient } from '../../src/generated/prisma/index.js'
import {
  TEST_TENANT_ID,
  TEST_ORG_ID,
  TEST_SCHEME_ID,
  TEST_PLAN_ID,
  TEST_CUSTOMER_ID,
} from '../fixtures/index.js'

// Use PgBouncer transaction mode (port 6543) to avoid session-mode connection exhaustion
const txUrl = (process.env['DATABASE_URL'] ?? '').replace(':5432/', ':6543/')
export const prisma = new PrismaClient({
  datasourceUrl: `${txUrl}?pgbouncer=true&connection_limit=1`,
})

/**
 * Insert a scheme, plan, and customer that tests can reference.
 * Uses upsert so re-runs are safe.
 */
export async function seedFixtures(): Promise<void> {
  // Use raw SQL ON CONFLICT DO NOTHING so concurrent beforeAll calls from multiple
  // spec files (Vitest singleFork runs them in parallel) are safe.
  await prisma.$executeRaw`
    INSERT INTO membership.membership_schemes (id, tenant_id, organisation_id, name)
    VALUES (${TEST_SCHEME_ID}::uuid, ${TEST_TENANT_ID}::uuid, ${TEST_ORG_ID}::uuid, 'Test Scheme')
    ON CONFLICT (id) DO NOTHING
  `

  await prisma.$executeRaw`
    INSERT INTO membership.membership_plans
      (id, tenant_id, organisation_id, scheme_id, name, ownership_type, duration_type, visibility, sort_order)
    VALUES
      (${TEST_PLAN_ID}::uuid, ${TEST_TENANT_ID}::uuid, ${TEST_ORG_ID}::uuid,
       ${TEST_SCHEME_ID}::uuid, 'Test Plan', 'person', 'fixed', 'public', 0)
    ON CONFLICT (id) DO NOTHING
  `

  await prisma.$executeRaw`
    INSERT INTO customer.customers (id, tenant_id)
    VALUES (${TEST_CUSTOMER_ID}::uuid, ${TEST_TENANT_ID}::uuid)
    ON CONFLICT (id) DO NOTHING
  `
}

/**
 * Delete all memberships for the test tenant. Call in afterEach.
 * Must delete lifecycle events first to satisfy the FK constraint.
 */
export async function cleanMemberships(): Promise<void> {
  await prisma.membershipLifecycleEvent.deleteMany({
    where: { membership: { tenantId: TEST_TENANT_ID } },
  })
  await prisma.membership.deleteMany({
    where: { tenantId: TEST_TENANT_ID },
  })
}

/**
 * Remove all fixture rows. Call in afterAll.
 */
export async function teardownFixtures(): Promise<void> {
  await cleanMemberships()
  await prisma.membershipPlanEntitlement.deleteMany({
    where: { tenantId: TEST_TENANT_ID },
  })
  await prisma.membershipPlan.deleteMany({
    where: { tenantId: TEST_TENANT_ID },
  })
  await prisma.membershipScheme.deleteMany({
    where: { tenantId: TEST_TENANT_ID },
  })
  await prisma.entitlementPolicy.deleteMany({
    where: { tenantId: TEST_TENANT_ID },
  })
  await prisma.$executeRaw`
    DELETE FROM customer.customers WHERE id = ${TEST_CUSTOMER_ID}::uuid
  `
}
