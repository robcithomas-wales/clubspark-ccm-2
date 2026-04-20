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

export async function cleanAll(): Promise<void> {
  // Delete in dependency order
  await prisma.$executeRaw`DELETE FROM team.charges WHERE team_member_id IN (
    SELECT id FROM team.team_members WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  )`
  await prisma.$executeRaw`DELETE FROM team.charge_runs WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
  await prisma.$executeRaw`DELETE FROM team.selections WHERE fixture_id IN (
    SELECT id FROM team.fixtures WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  )`
  await prisma.$executeRaw`DELETE FROM team.availability_responses WHERE fixture_id IN (
    SELECT id FROM team.fixtures WHERE tenant_id = ${TEST_TENANT_ID}::uuid
  )`
  await prisma.$executeRaw`DELETE FROM team.fixtures WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
  await prisma.$executeRaw`DELETE FROM team.team_members WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
  await prisma.$executeRaw`DELETE FROM team.teams WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
}
