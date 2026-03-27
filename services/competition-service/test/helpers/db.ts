import 'dotenv/config'
import { PrismaClient } from '../../src/generated/prisma/index.js'
import { TEST_TENANT_ID } from '../fixtures/index.js'

export const prisma = new PrismaClient({ datasourceUrl: `${process.env['DATABASE_URL']}?connection_limit=2` })

export async function checkDbAvailable(): Promise<boolean> {
  try { await prisma.$executeRaw`SELECT 1`; return true } catch { return false }
}

export async function cleanCompetitions(): Promise<void> {
  // Cascade deletes divisions, entries, matches, standings
  await prisma.$executeRaw`DELETE FROM competitions.competitions WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
}
