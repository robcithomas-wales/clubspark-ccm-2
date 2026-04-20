import 'dotenv/config'
import { PrismaClient } from '../../src/generated/prisma/index.js'
import { TEST_TENANT_ID } from '../fixtures/index.js'

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

export async function cleanCommsData(): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM comms.message_log WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
  await prisma.$executeRaw`
    DELETE FROM comms.campaigns WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
  await prisma.$executeRaw`
    DELETE FROM comms.saved_audiences WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
  await prisma.$executeRaw`
    DELETE FROM comms.suppression WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  `
}
