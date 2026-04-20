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

export async function cleanCoaches(): Promise<void> {
  // coach_lesson_types cascade-delete when coaches are removed
  await prisma.$executeRaw`DELETE FROM coaching.coaches WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
}

export async function cleanLessonTypes(): Promise<void> {
  await prisma.$executeRaw`DELETE FROM coaching.lesson_types WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
}

export async function cleanSessions(): Promise<void> {
  await prisma.$executeRaw`DELETE FROM coaching.lesson_sessions WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
}

export async function cleanAll(): Promise<void> {
  await cleanSessions()
  await cleanCoaches()
  await cleanLessonTypes()
}
