import 'dotenv/config'
import { PrismaClient } from '../../src/generated/prisma/index.js'
import { TEST_TENANT_ID, TEST_TENANT_ID_B } from '../fixtures/index.js'

export const prisma = new PrismaClient({
  datasourceUrl: `${process.env['DATABASE_URL']}?pgbouncer=true&connection_limit=2`,
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
  // Use $executeRawUnsafe to avoid prepared statement caching issues with PgBouncer pooler
  await prisma.$executeRawUnsafe(`
    DELETE FROM integration.webhook_deliveries
    WHERE subscription_id IN (
      SELECT id FROM integration.webhook_subscriptions
      WHERE tenant_id IN ('${TEST_TENANT_ID}', '${TEST_TENANT_ID_B}')
    )`)
  await prisma.$executeRawUnsafe(`
    DELETE FROM integration.webhook_subscriptions
    WHERE tenant_id IN ('${TEST_TENANT_ID}', '${TEST_TENANT_ID_B}')`)
  await prisma.$executeRawUnsafe(`
    DELETE FROM integration.api_key_usage
    WHERE api_key_id IN (
      SELECT id FROM integration.api_keys
      WHERE tenant_id IN ('${TEST_TENANT_ID}', '${TEST_TENANT_ID_B}')
    )`)
  await prisma.$executeRawUnsafe(`
    DELETE FROM integration.api_keys
    WHERE tenant_id IN ('${TEST_TENANT_ID}', '${TEST_TENANT_ID_B}')`)
  await prisma.$executeRawUnsafe(`
    DELETE FROM integration.accounting_sync_log
    WHERE tenant_id IN ('${TEST_TENANT_ID}', '${TEST_TENANT_ID_B}')`)
  await prisma.$executeRawUnsafe(`
    DELETE FROM integration.oauth_connections
    WHERE tenant_id IN ('${TEST_TENANT_ID}', '${TEST_TENANT_ID_B}')`)
  await prisma.$executeRawUnsafe(`
    DELETE FROM integration.accounting_settings
    WHERE tenant_id IN ('${TEST_TENANT_ID}', '${TEST_TENANT_ID_B}')`)
}
