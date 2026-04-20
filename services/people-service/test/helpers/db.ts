import 'dotenv/config'
import { PrismaClient } from '../../src/generated/prisma/index.js'
import { TEST_TENANT_ID } from '../fixtures/index.js'

export const prisma = new PrismaClient({
  datasourceUrl: `${process.env['DATABASE_URL']}?pgbouncer=true&connection_limit=2`,
})

/**
 * Returns true if the test database is reachable.
 * Integration tests call this in beforeAll and skip the suite if false.
 */
export async function checkDbAvailable(): Promise<boolean> {
  try {
    await prisma.$executeRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

/**
 * Delete all customers created during the test run.
 * Uses raw SQL because the people-service Prisma client targets the
 * people schema directly.
 */
export async function cleanCustomers(): Promise<void> {
  // Tags must be deleted before persons (FK cascade handles person_tags/lifecycle_history)
  await prisma.$executeRaw`DELETE FROM people.tags WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
  await prisma.$executeRaw`DELETE FROM people.persons WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
}

export async function cleanSegments(): Promise<void> {
  // segment_members cascade from segments
  await prisma.$executeRaw`DELETE FROM people.segments WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
}

export async function teardown(): Promise<void> {
  await cleanCustomers()
  await cleanSegments()
}
