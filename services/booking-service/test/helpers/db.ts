import 'dotenv/config'
import { PrismaClient } from '../../src/generated/prisma/index.js'
import {
  TEST_TENANT_ID,
  TEST_ORG_ID,
  TEST_VENUE_ID,
  TEST_RESOURCE_ID,
  TEST_UNIT_ID,
  TEST_UNIT_INACTIVE_ID,
} from '../fixtures/index.js'

export const prisma = new PrismaClient({
  datasourceUrl: `${process.env['DATABASE_URL']}?connection_limit=2`,
})

/**
 * Insert all fixture rows needed for the booking-service tests.
 * Uses INSERT ... ON CONFLICT DO NOTHING so re-runs are safe.
 */
export async function seedFixtures(): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO venue.venues (id, tenant_id, name)
    VALUES (${TEST_VENUE_ID}::uuid, ${TEST_TENANT_ID}::uuid, 'Test Venue')
    ON CONFLICT (id) DO NOTHING
  `

  await prisma.$executeRaw`
    INSERT INTO venue.resources (id, tenant_id, venue_id, name, resource_type)
    VALUES (${TEST_RESOURCE_ID}::uuid, ${TEST_TENANT_ID}::uuid, ${TEST_VENUE_ID}::uuid, 'Test Court', 'court')
    ON CONFLICT (id) DO NOTHING
  `

  await prisma.$executeRaw`
    INSERT INTO venue.bookable_units (id, tenant_id, venue_id, resource_id, name, unit_type, is_active)
    VALUES (
      ${TEST_UNIT_ID}::uuid, ${TEST_TENANT_ID}::uuid,
      ${TEST_VENUE_ID}::uuid, ${TEST_RESOURCE_ID}::uuid,
      'Full Court', 'full', true
    )
    ON CONFLICT (id) DO NOTHING
  `

  await prisma.$executeRaw`
    INSERT INTO venue.bookable_units (id, tenant_id, venue_id, resource_id, name, unit_type, is_active)
    VALUES (
      ${TEST_UNIT_INACTIVE_ID}::uuid, ${TEST_TENANT_ID}::uuid,
      ${TEST_VENUE_ID}::uuid, ${TEST_RESOURCE_ID}::uuid,
      'Inactive Court', 'full', false
    )
    ON CONFLICT (id) DO NOTHING
  `
}

/**
 * Remove all test bookings. Call in afterEach to keep tests isolated.
 */
export async function cleanBookings(): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM booking.booking_add_ons
    WHERE booking_id IN (
      SELECT id FROM booking.bookings WHERE tenant_id = ${TEST_TENANT_ID}::uuid
    )
  `
  await prisma.$executeRaw`
    DELETE FROM booking.bookings WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
}

/**
 * Remove all fixture rows. Call in afterAll.
 */
export async function teardownFixtures(): Promise<void> {
  await cleanBookings()
  await prisma.$executeRaw`
    DELETE FROM venue.bookable_units WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
  await prisma.$executeRaw`
    DELETE FROM venue.resources WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
  await prisma.$executeRaw`
    DELETE FROM venue.venues WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
}
