import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { cleanAdminUsers, teardown, checkDbAvailable } from './helpers/db.js'
import {
  TEST_TENANT_ID,
  TEST_SUPER_USER_ID,
  TEST_BASIC_USER_ID,
  TEST_NONEXISTENT_ID,
} from './fixtures/index.js'

const SUPER_HEADERS = {
  'x-tenant-id': TEST_TENANT_ID,
  'x-user-id': TEST_SUPER_USER_ID,
  'content-type': 'application/json',
}

const BASIC_HEADERS = {
  'x-tenant-id': TEST_TENANT_ID,
  'x-user-id': TEST_BASIC_USER_ID,
  'content-type': 'application/json',
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Admin service — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
  })

  afterAll(async () => {
    await teardown()
    await closeApp()
  })

  afterEach(async () => {
    await cleanAdminUsers()
  })

  // ─── Health ──────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('returns ok', async () => {
      const res = await request.get('/health')
      expect(res.status).toBe(200)
      expect(res.body.service).toBe('admin-service')
    })
  })

  // ─── GET /admin-users/me ──────────────────────────────────────────────────

  describe('GET /admin-users/me', () => {
    it('returns null when user has no admin record', async () => {
      const res = await request.get('/admin-users/me').set(SUPER_HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data).toBeNull()
    })

    it('returns the admin record when user exists', async () => {
      await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_SUPER_USER_ID, role: 'super' })

      const res = await request.get('/admin-users/me').set(SUPER_HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.role).toBe('super')
      expect(res.body.data.userId).toBe(TEST_SUPER_USER_ID)
    })
  })

  // ─── POST /admin-users (bootstrap) ───────────────────────────────────────

  describe('POST /admin-users — bootstrap', () => {
    it('allows first admin creation without role check', async () => {
      const res = await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_SUPER_USER_ID, role: 'super' })

      expect(res.status).toBe(201)
      expect(res.body.data.role).toBe('super')
      expect(res.body.data.userId).toBe(TEST_SUPER_USER_ID)
      expect(res.body.data.isActive).toBe(true)
    })

    it('rejects invalid role', async () => {
      const res = await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_SUPER_USER_ID, role: 'invalid_role' })

      expect(res.status).toBe(400)
    })

    it('rejects missing userId', async () => {
      const res = await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ role: 'super' })

      expect(res.status).toBe(400)
    })
  })

  // ─── POST /admin-users (requires super) ──────────────────────────────────

  describe('POST /admin-users — requires super', () => {
    beforeEach(async () => {
      // Seed a super admin so bootstrap path is no longer used
      await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_SUPER_USER_ID, role: 'super' })
    })

    it('super can create additional admin users', async () => {
      const res = await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_BASIC_USER_ID, role: 'website' })

      expect(res.status).toBe(201)
      expect(res.body.data.role).toBe('website')
    })

    it('non-super user cannot create admin users', async () => {
      await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_BASIC_USER_ID, role: 'website' })

      const res = await request
        .post('/admin-users')
        .set(BASIC_HEADERS)
        .send({ userId: 'another-user', role: 'bookings' })

      expect(res.status).toBe(403)
    })

    it('returns 409 on duplicate userId', async () => {
      const res = await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_SUPER_USER_ID, role: 'bookings' })

      expect(res.status).toBe(409)
    })
  })

  // ─── GET /admin-users ────────────────────────────────────────────────────

  describe('GET /admin-users', () => {
    beforeEach(async () => {
      await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_SUPER_USER_ID, role: 'super' })
    })

    it('super can list all admin users', async () => {
      await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_BASIC_USER_ID, role: 'website' })

      const res = await request.get('/admin-users').set(SUPER_HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
    })

    it('non-super cannot list admin users', async () => {
      await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_BASIC_USER_ID, role: 'website' })

      const res = await request.get('/admin-users').set(BASIC_HEADERS)
      expect(res.status).toBe(403)
    })
  })

  // ─── PATCH /admin-users/:id ───────────────────────────────────────────────

  describe('PATCH /admin-users/:id', () => {
    let adminId: string

    beforeEach(async () => {
      await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_SUPER_USER_ID, role: 'super' })

      const res = await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_BASIC_USER_ID, role: 'website' })

      adminId = res.body.data.id
    })

    it('super can update role', async () => {
      const res = await request
        .patch(`/admin-users/${adminId}`)
        .set(SUPER_HEADERS)
        .send({ role: 'bookings' })

      expect(res.status).toBe(200)
      expect(res.body.data.role).toBe('bookings')
    })

    it('super can deactivate', async () => {
      const res = await request
        .patch(`/admin-users/${adminId}`)
        .set(SUPER_HEADERS)
        .send({ isActive: false })

      expect(res.status).toBe(200)
      expect(res.body.data.isActive).toBe(false)
    })

    it('non-super cannot update', async () => {
      const res = await request
        .patch(`/admin-users/${adminId}`)
        .set(BASIC_HEADERS)
        .send({ role: 'super' })

      expect(res.status).toBe(403)
    })

    it('returns 404 for unknown id', async () => {
      const res = await request
        .patch(`/admin-users/${TEST_NONEXISTENT_ID}`)
        .set(SUPER_HEADERS)
        .send({ role: 'bookings' })

      expect(res.status).toBe(404)
    })
  })

  // ─── DELETE /admin-users/:id ──────────────────────────────────────────────

  describe('DELETE /admin-users/:id', () => {
    let basicAdminId: string
    let superAdminId: string

    beforeEach(async () => {
      const superRes = await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_SUPER_USER_ID, role: 'super' })
      superAdminId = superRes.body.data.id

      const basicRes = await request
        .post('/admin-users')
        .set(SUPER_HEADERS)
        .send({ userId: TEST_BASIC_USER_ID, role: 'website' })
      basicAdminId = basicRes.body.data.id
    })

    it('super can delete another admin user', async () => {
      const res = await request
        .delete(`/admin-users/${basicAdminId}`)
        .set(SUPER_HEADERS)

      expect(res.status).toBe(200)
    })

    it('cannot delete own account', async () => {
      const res = await request
        .delete(`/admin-users/${superAdminId}`)
        .set(SUPER_HEADERS)

      expect(res.status).toBe(403)
    })

    it('non-super cannot delete', async () => {
      const res = await request
        .delete(`/admin-users/${basicAdminId}`)
        .set(BASIC_HEADERS)

      expect(res.status).toBe(403)
    })
  })
})
