import 'dotenv/config'
import { PrismaClient } from '../../src/generated/prisma/index.js'
import { TEST_TENANT_ID } from '../fixtures/index.js'

export const prisma = new PrismaClient({
  datasourceUrl: `${process.env['DATABASE_URL']}?connection_limit=2`,
})

/**
 * Delete all customers created during the test run.
 * Uses raw SQL because the customer-service Prisma client targets the
 * customer schema directly.
 */
export async function cleanCustomers(): Promise<void> {
  // Tags must be deleted before customers (FK cascade handles person_tags/lifecycle_history)
  await prisma.$executeRaw`DELETE FROM customer.tags WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
  await prisma.$executeRaw`DELETE FROM customer.customers WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
}

export async function teardown(): Promise<void> {
  await cleanCustomers()
}
