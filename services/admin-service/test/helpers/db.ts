import 'dotenv/config'
import { PrismaClient } from '../../src/generated/prisma/index.js'
import { TEST_TENANT_ID } from '../fixtures/index.js'

export const prisma = new PrismaClient({
  datasourceUrl: `${process.env['DATABASE_URL']}?connection_limit=2`,
})

export async function cleanAdminUsers(): Promise<void> {
  await prisma.$executeRaw`DELETE FROM admin.admin_users WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
}

export async function teardown(): Promise<void> {
  await cleanAdminUsers()
  await prisma.$disconnect()
}
