import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable } from './helpers/db.js'
import { TEST_TENANT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

// System templates are seeded at app startup. 'booking.confirmed' is always present.
const KNOWN_TEMPLATE_KEY = 'booking.confirmed'

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Templates — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterAll(async () => { await prisma.$disconnect(); await closeApp() })

  describe('GET /templates', () => {
    it('lists system templates (seeded at startup)', async () => {
      const res = await request.get('/v1/templates').set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
    })

    it('includes the booking.confirmed system template', async () => {
      const res = await request.get('/v1/templates').set(HEADERS)
      const keys = res.body.map((t: any) => t.key)
      expect(keys).toContain(KNOWN_TEMPLATE_KEY)
    })

    it('returns 401 without auth', async () => {
      const res = await request.get('/v1/templates')
      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /templates/:key', () => {
    it('adds a custom footer override for a template', async () => {
      const res = await request
        .patch(`/v1/templates/${KNOWN_TEMPLATE_KEY}`)
        .set(JSON_HEADERS)
        .send({ customFooter: 'Need help? Email support@example.com', replyTo: 'support@example.com' })

      expect(res.status).toBe(200)
    })

    it('returns 404 for a non-existent template key', async () => {
      const res = await request
        .patch('/v1/templates/no.such.template')
        .set(JSON_HEADERS)
        .send({ customFooter: 'Footer' })

      expect(res.status).toBe(404)
    })

    it('returns 401 without auth', async () => {
      const res = await request
        .patch(`/v1/templates/${KNOWN_TEMPLATE_KEY}`)
        .send({ customFooter: 'Footer' })

      expect(res.status).toBe(401)
    })
  })
})
