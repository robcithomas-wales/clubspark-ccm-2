import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { createHmac } from 'crypto'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanAll } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_TENANT_ID_B, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const HEADERS_B = { 'x-tenant-id': TEST_TENANT_ID_B }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('API Keys — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as Parameters<typeof supertest>[0])
  })

  afterEach(async () => {
    await cleanAll()
  })

  afterAll(async () => {
    await cleanAll()
    await prisma.$disconnect()
    await closeApp()
  })

  it('returns 401 without tenant header', async () => {
    const res = await request.get('/v1/api-keys')
    expect(res.status).toBe(401)
  })

  it('returns empty list when no keys exist', async () => {
    const res = await request.get('/v1/api-keys').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('creates a key and returns plaintext once', async () => {
    const res = await request
      .post('/v1/api-keys')
      .set(JSON_HEADERS)
      .send({ name: 'NGB Feed', scopes: ['bookings:read'] })

    expect(res.status).toBe(201)
    expect(res.body.plaintext).toMatch(/^cs_[0-9a-f]{64}$/)
    expect(res.body.id).toBeDefined()
    expect(res.body.name).toBe('NGB Feed')
    expect(res.body.scopes).toEqual(['bookings:read'])
    expect(res.body.isActive).toBe(true)
  })

  it('stores a hash, not the plaintext, in the database', async () => {
    const res = await request
      .post('/v1/api-keys')
      .set(JSON_HEADERS)
      .send({ name: 'Hash Test', scopes: ['members:read'] })

    expect(res.status).toBe(201)
    const { plaintext, id } = res.body

    const row = await prisma.apiKey.findUnique({ where: { id } })
    expect(row).not.toBeNull()
    expect(row?.keyHash).not.toBe(plaintext)
    expect(row?.keyHash).toHaveLength(64)
  })

  it('lists created key without plaintext', async () => {
    await request
      .post('/v1/api-keys')
      .set(JSON_HEADERS)
      .send({ name: 'List Test', scopes: ['teams:read'] })

    const res = await request.get('/v1/api-keys').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].plaintext).toBeUndefined()
    expect(res.body.data[0].keyHash).toBeUndefined()
    expect(res.body.data[0].requestCount).toBe(0)
  })

  it('suspends and re-activates a key', async () => {
    const createRes = await request
      .post('/v1/api-keys')
      .set(JSON_HEADERS)
      .send({ name: 'Toggle Test', scopes: ['bookings:read'] })
    const id = createRes.body.id

    const suspendRes = await request.patch(`/v1/api-keys/${id}/suspend`).set(HEADERS)
    expect(suspendRes.status).toBe(200)

    const listRes = await request.get('/v1/api-keys').set(HEADERS)
    expect(listRes.body.data[0].isActive).toBe(false)

    const activateRes = await request.patch(`/v1/api-keys/${id}/activate`).set(HEADERS)
    expect(activateRes.status).toBe(200)

    const listRes2 = await request.get('/v1/api-keys').set(HEADERS)
    expect(listRes2.body.data[0].isActive).toBe(true)
  })

  it('revokes a key (soft delete) and excludes it from the list', async () => {
    const createRes = await request
      .post('/v1/api-keys')
      .set(JSON_HEADERS)
      .send({ name: 'Revoke Test', scopes: ['bookings:read'] })
    const id = createRes.body.id

    const revokeRes = await request.delete(`/v1/api-keys/${id}`).set(HEADERS)
    expect(revokeRes.status).toBe(200)

    const listRes = await request.get('/v1/api-keys').set(HEADERS)
    expect(listRes.body.data).toHaveLength(0)

    const row = await prisma.apiKey.findUnique({ where: { id } })
    expect(row?.deletedAt).not.toBeNull()
    expect(row?.isActive).toBe(false)
  })

  it('returns 404 for non-existent key on suspend', async () => {
    const res = await request.patch(`/v1/api-keys/${TEST_NONEXISTENT_ID}/suspend`).set(HEADERS)
    expect(res.status).toBe(404)
  })

  it('returns paginated usage log', async () => {
    const createRes = await request
      .post('/v1/api-keys')
      .set(JSON_HEADERS)
      .send({ name: 'Usage Test', scopes: ['bookings:read'] })
    const id = createRes.body.id

    const res = await request.get(`/v1/api-keys/${id}/usage`).set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.pagination.total).toBe(0)
  })

  it('enforces cross-tenant isolation — tenant A cannot see tenant B keys', async () => {
    await request
      .post('/v1/api-keys')
      .set({ 'x-tenant-id': TEST_TENANT_ID_B, 'content-type': 'application/json' })
      .send({ name: 'Tenant B Key', scopes: ['bookings:read'] })

    const res = await request.get('/v1/api-keys').set(HEADERS)
    expect(res.body.data).toHaveLength(0)
  })

  it('rejects invalid scope values', async () => {
    const res = await request
      .post('/v1/api-keys')
      .set(JSON_HEADERS)
      .send({ name: 'Bad Scopes', scopes: ['invalid:scope'] })

    expect(res.status).toBe(400)
  })
})
