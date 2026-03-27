import 'dotenv/config'
import { PrismaClient } from '../../src/generated/prisma/index.js'
import { TEST_TENANT_ID } from '../fixtures/index.js'

export const prisma = new PrismaClient({
  datasourceUrl: `${process.env['DATABASE_URL']}?connection_limit=2`,
})

export async function checkDbAvailable(): Promise<boolean> {
  try {
    await prisma.$executeRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

export async function cleanAll(): Promise<void> {
  // Delete in dependency order
  await prisma.$executeRaw`DELETE FROM payment.refunds
    WHERE payment_id IN (
      SELECT id FROM payment.payments WHERE tenant_id = ${TEST_TENANT_ID}::uuid
    )`
  await prisma.$executeRaw`DELETE FROM payment.payment_attempts
    WHERE payment_id IN (
      SELECT id FROM payment.payments WHERE tenant_id = ${TEST_TENANT_ID}::uuid
    )`
  await prisma.$executeRaw`DELETE FROM payment.webhook_events
    WHERE provider_config_id IN (
      SELECT id FROM payment.provider_configs WHERE tenant_id = ${TEST_TENANT_ID}::uuid
    )`
  await prisma.$executeRaw`DELETE FROM payment.payments WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
  await prisma.$executeRaw`DELETE FROM payment.provider_configs WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
}
