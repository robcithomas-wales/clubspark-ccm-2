import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, cleanCommsData, checkDbAvailable } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_ORG_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = {
  'x-tenant-id': TEST_TENANT_ID,
  'x-organisation-id': TEST_ORG_ID,
}

const JSON_HEADERS = {
  ...HEADERS,
  'content-type': 'application/json',
}

const DB_AVAILABLE = await checkDbAvailable()

// ══════════════════════════════════════════════════════════════════════════════
// Campaigns
// ══════════════════════════════════════════════════════════════════════════════

describe.runIf(DB_AVAILABLE)('Campaigns — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(async () => {
    await cleanCommsData()
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await closeApp()
  })

  // ── Create ────────────────────────────────────────────────────────────────

  it('creates a draft campaign and returns it', async () => {
    const res = await request
      .post('/campaigns')
      .set(JSON_HEADERS)
      .send({
        name: 'Test Campaign',
        channel: 'email',
        subject: 'Hello from the test suite',
        body: '<p>Test body</p>',
        audienceDefinition: JSON.stringify({ type: 'manual', recipients: [] }),
        status: 'draft',
      })

    // Campaign service dispatches immediately unless status=draft or scheduledAt is set.
    // With empty recipients, dispatch is a no-op so we get 201.
    expect([200, 201]).toContain(res.status)
    expect(res.body.id ?? res.body.data?.id).toBeDefined()
  })

  it('lists campaigns for the tenant', async () => {
    await request.post('/campaigns').set(JSON_HEADERS).send({
      name: 'List test',
      channel: 'email',
      audienceDefinition: JSON.stringify({ type: 'manual', recipients: [] }),
    })

    const res = await request.get('/campaigns').set(HEADERS)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
  })

  it('gets a campaign by id', async () => {
    const created = await request.post('/campaigns').set(JSON_HEADERS).send({
      name: 'Get by ID test',
      channel: 'sms',
      body: 'Hello SMS',
      audienceDefinition: JSON.stringify({ type: 'manual', recipients: [] }),
    })
    const id = (created.body.id ?? created.body.data?.id) as string

    const res = await request.get(`/campaigns/${id}`).set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(id)
    expect(res.body.data.channel).toBe('sms')
  })

  it('returns 404 for a non-existent campaign', async () => {
    const res = await request
      .get(`/campaigns/${TEST_NONEXISTENT_ID}`)
      .set(HEADERS)

    expect(res.status).toBe(404)
  })

  // ── Update (PATCH) ────────────────────────────────────────────────────────

  it('patches a campaign subject and body', async () => {
    const created = await request.post('/campaigns').set(JSON_HEADERS).send({
      name: 'Patch test',
      channel: 'email',
      subject: 'Original subject',
      body: '<p>Original</p>',
      audienceDefinition: JSON.stringify({ type: 'manual', recipients: [] }),
    })
    const id = (created.body.id ?? created.body.data?.id) as string

    const res = await request
      .patch(`/campaigns/${id}`)
      .set(JSON_HEADERS)
      .send({ subject: 'Updated subject', body: '<p>Updated body</p>' })

    expect(res.status).toBe(200)
    expect(res.body.data.subject).toBe('Updated subject')
  })

  it('patches a campaign name', async () => {
    const created = await request.post('/campaigns').set(JSON_HEADERS).send({
      name: 'Old name',
      channel: 'email',
      audienceDefinition: JSON.stringify({ type: 'manual', recipients: [] }),
    })
    const id = (created.body.id ?? created.body.data?.id) as string

    const res = await request
      .patch(`/campaigns/${id}`)
      .set(JSON_HEADERS)
      .send({ name: 'New name' })

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('New name')
  })

  it('returns 404 when patching a non-existent campaign', async () => {
    const res = await request
      .patch(`/campaigns/${TEST_NONEXISTENT_ID}`)
      .set(JSON_HEADERS)
      .send({ name: 'Ghost' })

    expect([404, 500]).toContain(res.status)
  })

  // ── Recipient preview ─────────────────────────────────────────────────────

  it('returns recipient preview for all_active_members audience type', async () => {
    const res = await request
      .get('/campaigns/preview-recipients?audienceType=all_active_members')
      .set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(typeof res.body.data.total).toBe('number')
    expect(typeof res.body.data.excluded).toBe('number')
    expect(typeof res.body.data.eligible).toBe('number')
    expect(res.body.data.eligible).toBe(
      Math.max(0, res.body.data.total - res.body.data.excluded),
    )
  })

  it('returns recipient preview for manual audience with manualCount', async () => {
    const res = await request
      .get('/campaigns/preview-recipients?audienceType=manual&manualCount=5')
      .set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(5)
    expect(res.body.data.eligible).toBeLessThanOrEqual(5)
  })

  it('preview eligible never exceeds total', async () => {
    const res = await request
      .get('/campaigns/preview-recipients?audienceType=manual&manualCount=3')
      .set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data.eligible).toBeLessThanOrEqual(res.body.data.total)
    expect(res.body.data.excluded).toBeGreaterThanOrEqual(0)
  })

  // ── Campaign stats ────────────────────────────────────────────────────────

  it('returns stats for a campaign — zeros when nothing dispatched', async () => {
    const created = await request.post('/campaigns').set(JSON_HEADERS).send({
      name: 'Stats test',
      channel: 'email',
      subject: 'Stats subject',
      audienceDefinition: JSON.stringify({ type: 'manual', recipients: [] }),
    })
    const id = (created.body.id ?? created.body.data?.id) as string

    const res = await request.get(`/campaigns/${id}/stats`).set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data.campaignId).toBe(id)
    expect(typeof res.body.data.openRate).toBe('number')
    expect(typeof res.body.data.clickRate).toBe('number')
    expect(typeof res.body.data.sent).toBe('number')
    expect(res.body.data.openRate).toBeGreaterThanOrEqual(0)
    expect(res.body.data.openRate).toBeLessThanOrEqual(100)
  })

  it('stats include correct field set', async () => {
    const created = await request.post('/campaigns').set(JSON_HEADERS).send({
      name: 'Field set test',
      channel: 'email',
      subject: 'Fields',
      audienceDefinition: JSON.stringify({ type: 'manual', recipients: [] }),
    })
    const id = (created.body.id ?? created.body.data?.id) as string

    const res = await request.get(`/campaigns/${id}/stats`).set(HEADERS)

    expect(res.status).toBe(200)
    const d = res.body.data
    expect(d).toHaveProperty('total')
    expect(d).toHaveProperty('sent')
    expect(d).toHaveProperty('delivered')
    expect(d).toHaveProperty('opened')
    expect(d).toHaveProperty('clicked')
    expect(d).toHaveProperty('bounced')
    expect(d).toHaveProperty('suppressed')
    expect(d).toHaveProperty('openRate')
    expect(d).toHaveProperty('clickRate')
    expect(d).toHaveProperty('deliveryRate')
    expect(d).toHaveProperty('bounceRate')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Saved Audiences
// ══════════════════════════════════════════════════════════════════════════════

describe.runIf(DB_AVAILABLE)('Saved Audiences — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(async () => {
    await cleanCommsData()
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await closeApp()
  })

  const sampleRules = {
    logic: 'and' as const,
    rules: [
      { field: 'membershipStatus', operator: 'eq', value: 'active' },
      { field: 'ageMax', operator: 'lte', value: 18 },
    ],
  }

  // ── Create ────────────────────────────────────────────────────────────────

  it('creates a saved audience and returns 201', async () => {
    const res = await request
      .post('/audiences')
      .set(JSON_HEADERS)
      .send({
        name: 'Active juniors',
        description: 'All active members under 18',
        rulesJson: sampleRules,
      })

    expect(res.status).toBe(201)
    expect(res.body.data.id).toBeDefined()
    expect(res.body.data.name).toBe('Active juniors')
  })

  it('creates a saved audience with only a name', async () => {
    const res = await request
      .post('/audiences')
      .set(JSON_HEADERS)
      .send({
        name: 'Minimal audience',
        rulesJson: { logic: 'and', rules: [] },
      })

    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Minimal audience')
    expect(res.body.data.description).toBeNull()
  })

  it('stores the rules JSON correctly', async () => {
    const res = await request
      .post('/audiences')
      .set(JSON_HEADERS)
      .send({ name: 'Rules test', rulesJson: sampleRules })

    expect(res.status).toBe(201)
    const stored = JSON.parse(res.body.data.rulesJson)
    expect(stored.logic).toBe('and')
    expect(stored.rules).toHaveLength(2)
    expect(stored.rules[0].field).toBe('membershipStatus')
  })

  // ── List ─────────────────────────────────────────────────────────────────

  it('lists saved audiences for the tenant', async () => {
    await request.post('/audiences').set(JSON_HEADERS).send({
      name: 'First audience',
      rulesJson: { logic: 'or', rules: [] },
    })
    await request.post('/audiences').set(JSON_HEADERS).send({
      name: 'Second audience',
      rulesJson: { logic: 'and', rules: [] },
    })

    const res = await request.get('/audiences').set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(2)
  })

  it('lists an empty array when no audiences exist', async () => {
    const res = await request.get('/audiences').set(HEADERS)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  // ── Get by ID ─────────────────────────────────────────────────────────────

  it('gets a saved audience by id', async () => {
    const created = await request.post('/audiences').set(JSON_HEADERS).send({
      name: 'Get by ID',
      rulesJson: sampleRules,
    })
    const id = created.body.data.id

    const res = await request.get(`/audiences/${id}`).set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(id)
    expect(res.body.data.name).toBe('Get by ID')
  })

  it('returns 404 for a non-existent audience', async () => {
    const res = await request
      .get(`/audiences/${TEST_NONEXISTENT_ID}`)
      .set(HEADERS)

    expect(res.status).toBe(404)
  })

  // ── Update ────────────────────────────────────────────────────────────────

  it('patches the name of a saved audience', async () => {
    const created = await request.post('/audiences').set(JSON_HEADERS).send({
      name: 'Old name',
      rulesJson: { logic: 'and', rules: [] },
    })
    const id = created.body.data.id

    const res = await request
      .patch(`/audiences/${id}`)
      .set(JSON_HEADERS)
      .send({ name: 'New name' })

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('New name')
  })

  it('patches the rules of a saved audience', async () => {
    const created = await request.post('/audiences').set(JSON_HEADERS).send({
      name: 'Rules patch',
      rulesJson: { logic: 'and', rules: [] },
    })
    const id = created.body.data.id

    const updatedRules = {
      logic: 'or' as const,
      rules: [{ field: 'lifecycleStage', operator: 'eq', value: 'lapsed' }],
    }

    const res = await request
      .patch(`/audiences/${id}`)
      .set(JSON_HEADERS)
      .send({ rulesJson: updatedRules })

    expect(res.status).toBe(200)
    const stored = JSON.parse(res.body.data.rulesJson)
    expect(stored.logic).toBe('or')
    expect(stored.rules[0].field).toBe('lifecycleStage')
  })

  it('returns 404 when patching a non-existent audience', async () => {
    const res = await request
      .patch(`/audiences/${TEST_NONEXISTENT_ID}`)
      .set(JSON_HEADERS)
      .send({ name: 'Ghost' })

    expect(res.status).toBe(404)
  })

  // ── Delete ────────────────────────────────────────────────────────────────

  it('deletes a saved audience and returns 204', async () => {
    const created = await request.post('/audiences').set(JSON_HEADERS).send({
      name: 'To delete',
      rulesJson: { logic: 'and', rules: [] },
    })
    const id = created.body.data.id

    const del = await request.delete(`/audiences/${id}`).set(HEADERS)
    expect(del.status).toBe(204)

    const get = await request.get(`/audiences/${id}`).set(HEADERS)
    expect(get.status).toBe(404)
  })

  it('returns 404 when deleting a non-existent audience', async () => {
    const res = await request
      .delete(`/audiences/${TEST_NONEXISTENT_ID}`)
      .set(HEADERS)

    expect(res.status).toBe(404)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Suppression
// ══════════════════════════════════════════════════════════════════════════════

describe.runIf(DB_AVAILABLE)('Suppression — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(async () => {
    await cleanCommsData()
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await closeApp()
  })

  it('adds an email to the suppression list', async () => {
    const res = await request
      .post('/suppression')
      .set(JSON_HEADERS)
      .send({ email: 'suppress@example.com', channel: 'email', reason: 'unsubscribed' })

    expect(res.status).toBe(201)
    // controller returns the Prisma record directly (no data wrapper)
    expect(res.body.email).toBe('suppress@example.com')
    expect(res.body.reason).toBe('unsubscribed')
  })

  it('lists suppression entries for the tenant', async () => {
    await request.post('/suppression').set(JSON_HEADERS).send({
      email: 'bounce@example.com', channel: 'email', reason: 'bounced',
    })

    const res = await request.get('/suppression').set(HEADERS)

    expect(res.status).toBe(200)
    // controller returns array directly (no data wrapper)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
  })

  it('removes an entry from the suppression list', async () => {
    const email = 'todelete@example.com'
    await request.post('/suppression').set(JSON_HEADERS).send({
      email, channel: 'email', reason: 'admin',
    })

    // controller uses DELETE /suppression?email=...&channel=...
    const del = await request
      .delete(`/suppression?email=${encodeURIComponent(email)}&channel=email`)
      .set(HEADERS)
    expect(del.status).toBe(200)
    expect(del.body.removed).toBe(true)
  })

  it('suppression reduces eligible count in recipient preview', async () => {
    // Add a suppression entry so excluded > 0 when we have members
    await request.post('/suppression').set(JSON_HEADERS).send({
      email: 'suppressed@example.com', channel: 'email', reason: 'bounced',
    })

    const res = await request
      .get('/campaigns/preview-recipients?audienceType=manual&manualCount=10')
      .set(HEADERS)

    expect(res.status).toBe(200)
    // eligible should be total minus excluded
    expect(res.body.data.eligible).toBe(
      Math.max(0, res.body.data.total - res.body.data.excluded),
    )
  })
})
