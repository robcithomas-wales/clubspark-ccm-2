import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import supertest from 'supertest'
import { encryptToken } from '../src/common/crypto/token-encryption.js'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanAll } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_TENANT_ID_B } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }
const HEADERS_B = { 'x-tenant-id': TEST_TENANT_ID_B }

const DB_AVAILABLE = await checkDbAvailable()

// We stub outbound HTTP calls to Xero/QuickBooks so tests run offline
vi.stubGlobal('fetch', vi.fn())

describe.runIf(DB_AVAILABLE)('Accounting — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as Parameters<typeof supertest>[0])
  })

  afterEach(async () => {
    vi.mocked(fetch).mockReset()
    await cleanAll()
  })

  afterAll(async () => {
    await cleanAll()
    await prisma.$disconnect()
    await closeApp()
  })

  // ── OAuth Connections ────────────────────────────────────────────────────────

  it('GET /v1/connections returns empty list when no connections', async () => {
    const res = await request.get('/v1/connections').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('returns 401 without tenant header on /v1/connections', async () => {
    const res = await request.get('/v1/connections')
    expect(res.status).toBe(401)
  })

  it('POST /v1/connections/xero/connect returns an auth URL with state containing tenantId', async () => {
    const res = await request.post('/v1/connections/xero/connect').set(HEADERS)
    expect(res.status).toBe(201)
    expect(res.body.url).toMatch(/^https:\/\/login\.xero\.com/)
    const stateParam = new URL(res.body.url as string).searchParams.get('state')!
    const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
    expect(decoded.tenantId).toBe(TEST_TENANT_ID)
  })

  it('POST /v1/connections/quickbooks/connect returns an auth URL with state containing tenantId', async () => {
    const res = await request.post('/v1/connections/quickbooks/connect').set(HEADERS)
    expect(res.status).toBe(201)
    expect(res.body.url).toMatch(/^https:\/\/appcenter\.intuit\.com/)
    const stateParam = new URL(res.body.url as string).searchParams.get('state')!
    const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
    expect(decoded.tenantId).toBe(TEST_TENANT_ID)
  })

  it('DELETE /v1/connections/:provider returns 404 when no connection', async () => {
    const res = await request.delete('/v1/connections/xero').set(HEADERS)
    expect(res.status).toBe(404)
  })

  it('lists and disconnects an OAuth connection', async () => {
    const encKey = process.env['TOKEN_ENCRYPTION_KEY'] ?? 'dev-encryption-key-32-bytes-here!'
    await prisma.oAuthConnection.create({
      data: {
        tenantId: TEST_TENANT_ID,
        provider: 'xero',
        providerTenantId: 'xero-tenant-abc',
        accessToken: encryptToken('fake-access', encKey),
        refreshToken: encryptToken('fake-refresh', encKey),
        tokenExpiry: new Date(Date.now() + 3600 * 1000),
        scopes: ['accounting.transactions'],
      },
    })

    const listRes = await request.get('/v1/connections').set(HEADERS)
    expect(listRes.status).toBe(200)
    expect(listRes.body.data).toHaveLength(1)
    expect(listRes.body.data[0].provider).toBe('xero')
    expect(listRes.body.data[0].accessToken).toBeUndefined() // never exposed

    const delRes = await request.delete('/v1/connections/xero').set(HEADERS)
    expect(delRes.status).toBe(200)

    const afterRes = await request.get('/v1/connections').set(HEADERS)
    expect(afterRes.body.data).toHaveLength(0)
  })

  it('cross-tenant: tenantB cannot see tenantA connections', async () => {
    const encKey = process.env['TOKEN_ENCRYPTION_KEY'] ?? 'dev-encryption-key-32-bytes-here!'
    await prisma.oAuthConnection.create({
      data: {
        tenantId: TEST_TENANT_ID,
        provider: 'xero',
        providerTenantId: null,
        accessToken: encryptToken('at', encKey),
        refreshToken: encryptToken('rt', encKey),
        tokenExpiry: new Date(Date.now() + 3600 * 1000),
        scopes: [],
      },
    })
    const res = await request.get('/v1/connections').set(HEADERS_B)
    expect(res.body.data).toHaveLength(0)
  })

  // ── Accounting Settings ──────────────────────────────────────────────────────

  it('GET /v1/accounting/settings returns null when not configured', async () => {
    const res = await request.get('/v1/accounting/settings').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
  })

  it('PUT /v1/accounting/settings creates settings', async () => {
    const res = await request
      .put('/v1/accounting/settings')
      .set(JSON_HEADERS)
      .send({ provider: 'xero', revenueAccountCode: '200', invoiceMode: 'AUTHORISED', currencyCode: 'GBP' })

    expect(res.status).toBe(200)
    expect(res.body.provider).toBe('xero')
    expect(res.body.revenueAccountCode).toBe('200')
    expect(res.body.invoiceMode).toBe('AUTHORISED')
  })

  it('PUT /v1/accounting/settings updates existing settings', async () => {
    await request
      .put('/v1/accounting/settings')
      .set(JSON_HEADERS)
      .send({ provider: 'xero', revenueAccountCode: '200' })

    const res = await request
      .put('/v1/accounting/settings')
      .set(JSON_HEADERS)
      .send({ provider: 'xero', revenueAccountCode: '205', invoiceMode: 'DRAFT' })

    expect(res.status).toBe(200)
    expect(res.body.revenueAccountCode).toBe('205')
    expect(res.body.invoiceMode).toBe('DRAFT')
  })

  it('PUT /v1/accounting/settings rejects invalid provider', async () => {
    const res = await request
      .put('/v1/accounting/settings')
      .set(JSON_HEADERS)
      .send({ provider: 'sage', revenueAccountCode: '200' })

    expect(res.status).toBe(400)
  })

  it('PUT /v1/accounting/settings rejects missing revenueAccountCode', async () => {
    const res = await request
      .put('/v1/accounting/settings')
      .set(JSON_HEADERS)
      .send({ provider: 'xero' })

    expect(res.status).toBe(400)
  })

  it('settings are tenant-isolated', async () => {
    await request
      .put('/v1/accounting/settings')
      .set(JSON_HEADERS)
      .send({ provider: 'xero', revenueAccountCode: '200' })

    const res = await request.get('/v1/accounting/settings').set(HEADERS_B)
    expect(res.body).toBeNull()
  })

  // ── Accounting Sync Log ──────────────────────────────────────────────────────

  it('GET /v1/accounting/sync-log returns empty when no entries', async () => {
    const res = await request.get('/v1/accounting/sync-log').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.pagination.total).toBe(0)
  })

  it('sync log returns entries scoped to tenant', async () => {
    const encKey = process.env['TOKEN_ENCRYPTION_KEY'] ?? 'dev-encryption-key-32-bytes-here!'
    const conn = await prisma.oAuthConnection.create({
      data: {
        tenantId: TEST_TENANT_ID,
        provider: 'xero',
        providerTenantId: 'xt',
        accessToken: encryptToken('at', encKey),
        refreshToken: encryptToken('rt', encKey),
        tokenExpiry: new Date(Date.now() + 3600 * 1000),
        scopes: [],
      },
    })

    await prisma.accountingSyncLog.create({
      data: {
        connectionId: conn.id,
        tenantId: TEST_TENANT_ID,
        eventType: 'payment.succeeded',
        sourceId: 'pay-001',
        sourceType: 'payment',
        status: 'synced',
        providerRef: 'xero-inv-001',
        attempts: 1,
        syncedAt: new Date(),
      },
    })

    const res = await request.get('/v1/accounting/sync-log').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].eventType).toBe('payment.succeeded')
    expect(res.body.data[0].status).toBe('synced')
    expect(res.body.data[0].providerRef).toBe('xero-inv-001')

    // Tenant B sees nothing
    const resB = await request.get('/v1/accounting/sync-log').set(HEADERS_B)
    expect(resB.body.data).toHaveLength(0)
  })

  it('sync log pagination works', async () => {
    const encKey = process.env['TOKEN_ENCRYPTION_KEY'] ?? 'dev-encryption-key-32-bytes-here!'
    const conn = await prisma.oAuthConnection.create({
      data: {
        tenantId: TEST_TENANT_ID,
        provider: 'xero',
        providerTenantId: 'xt',
        accessToken: encryptToken('at', encKey),
        refreshToken: encryptToken('rt', encKey),
        tokenExpiry: new Date(Date.now() + 3600 * 1000),
        scopes: [],
      },
    })

    await prisma.accountingSyncLog.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        connectionId: conn.id,
        tenantId: TEST_TENANT_ID,
        eventType: 'payment.succeeded',
        sourceId: `pay-${i}`,
        sourceType: 'payment',
        status: 'synced' as const,
      })),
    })

    const res = await request.get('/v1/accounting/sync-log?page=1&limit=3').set(HEADERS)
    expect(res.body.data).toHaveLength(3)
    expect(res.body.pagination.total).toBe(5)
    expect(res.body.pagination.totalPages).toBe(2)
  })
})
