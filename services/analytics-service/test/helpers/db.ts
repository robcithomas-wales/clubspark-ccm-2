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

export async function cleanScores(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DELETE FROM analytics.member_scores
    WHERE tenant_id IN ('${TEST_TENANT_ID}', '${TEST_TENANT_ID_B}')
  `)
}

export async function cleanForecasts(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DELETE FROM analytics.forecast_slots
    WHERE tenant_id IN ('${TEST_TENANT_ID}', '${TEST_TENANT_ID_B}')
  `)
}

export async function cleanAnomalies(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DELETE FROM analytics.anomaly_flags
    WHERE tenant_id IN ('${TEST_TENANT_ID}', '${TEST_TENANT_ID_B}')
  `)
}
