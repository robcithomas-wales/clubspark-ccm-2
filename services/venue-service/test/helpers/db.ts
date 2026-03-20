import 'dotenv/config'
import { PrismaClient } from '../../src/generated/prisma/index.js'
import {
  TEST_TENANT_ID,
  TEST_VENUE_ID,
  TEST_RESOURCE_ID,
} from '../fixtures/index.js'

export const prisma = new PrismaClient({
  datasourceUrl: `${process.env['DATABASE_URL']}?connection_limit=2`,
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
 * Insert a venue and resource that tests can reference.
 */
export async function seedFixtures(): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO venue.venues (id, tenant_id, name, timezone, country)
    VALUES (${TEST_VENUE_ID}::uuid, ${TEST_TENANT_ID}::uuid, 'Test Venue', 'Europe/London', 'GB')
    ON CONFLICT (id) DO NOTHING
  `

  await prisma.$executeRaw`
    INSERT INTO venue.resources (id, tenant_id, venue_id, name, resource_type, is_active)
    VALUES (${TEST_RESOURCE_ID}::uuid, ${TEST_TENANT_ID}::uuid, ${TEST_VENUE_ID}::uuid, 'Test Court 1', 'court', true)
    ON CONFLICT (id) DO NOTHING
  `
}

/**
 * Remove all test data in reverse FK order.
 */
export async function teardownFixtures(): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM venue.availability_configs WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
  await prisma.$executeRaw`
    DELETE FROM venue.blackout_dates WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
  await prisma.$executeRaw`
    DELETE FROM venue.bookable_units WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
  await prisma.$executeRaw`
    DELETE FROM venue.add_ons WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
  await prisma.$executeRaw`
    DELETE FROM venue.resources WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
  await prisma.$executeRaw`
    DELETE FROM venue.resource_groups WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
  await prisma.$executeRaw`
    DELETE FROM venue.venues WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
}
