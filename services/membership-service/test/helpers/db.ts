import 'dotenv/config'
import { PrismaClient } from '../../src/generated/prisma/index.js'
import {
  TEST_TENANT_ID,
  TEST_ORG_ID,
  TEST_SCHEME_ID,
  TEST_PLAN_ID,
  TEST_CUSTOMER_ID,
} from '../fixtures/index.js'

export const prisma = new PrismaClient({
  datasourceUrl: `${process.env['DATABASE_URL']}?connection_limit=2`,
})

/**
 * Insert a scheme, plan, and customer that tests can reference.
 * Uses upsert so re-runs are safe.
 */
export async function seedFixtures(): Promise<void> {
  await prisma.membershipScheme.upsert({
    where: { id: TEST_SCHEME_ID },
    create: {
      id: TEST_SCHEME_ID,
      tenantId: TEST_TENANT_ID,
      organisationId: TEST_ORG_ID,
      name: 'Test Scheme',
    },
    update: {},
  })

  await prisma.membershipPlan.upsert({
    where: { id: TEST_PLAN_ID },
    create: {
      id: TEST_PLAN_ID,
      tenantId: TEST_TENANT_ID,
      organisationId: TEST_ORG_ID,
      schemeId: TEST_SCHEME_ID,
      name: 'Test Plan',
      ownershipType: 'person',
      durationType: 'fixed',
      visibility: 'public',
      sortOrder: 0,
    },
    update: {},
  })

  // Create a test customer in the customer schema to satisfy the FK on memberships.customer_id
  await prisma.$executeRaw`
    INSERT INTO customer.customers (id, tenant_id)
    VALUES (${TEST_CUSTOMER_ID}::uuid, ${TEST_TENANT_ID}::uuid)
    ON CONFLICT (id) DO NOTHING
  `
}

/**
 * Delete all memberships for the test tenant. Call in afterEach.
 */
export async function cleanMemberships(): Promise<void> {
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
