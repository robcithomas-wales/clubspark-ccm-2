#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const command = args.shift()
const values = (name) =>
  args.flatMap((arg, index) => (arg === `--${name}` && args[index + 1] ? [args[index + 1]] : []))
const value = (name) => values(name)[0]
const tenants = values('tenant')
const source = value('source')
const eventId = value('event')
const statePath = resolve(value('state') ?? '.projection-backfill-state.json')
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const urls = {
  booking: process.env.BOOKING_SERVICE_URL ?? 'http://127.0.0.1:4005',
  venue: process.env.VENUE_SERVICE_URL ?? 'http://127.0.0.1:4003',
  coaching: process.env.COACHING_SERVICE_URL ?? 'http://127.0.0.1:4007',
}
const secret = process.env.INTERNAL_SECRET

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

if (!secret) fail('INTERNAL_SECRET is required')
if (!command) {
  fail(
    'Usage: npm run projection:ops -- <backfill|reconcile|status|dead-letters|replay> --tenant <uuid>',
  )
}
if (!tenants.length || tenants.some((tenant) => !uuid.test(tenant))) {
  fail('At least one valid --tenant UUID is required')
}
if (
  (command === 'dead-letters' || command === 'replay') &&
  !['venue', 'coaching'].includes(source)
) {
  fail('--source must be venue or coaching')
}
if (command === 'replay' && (!eventId || !uuid.test(eventId))) {
  fail('A valid --event UUID is required')
}

async function request(service, path, tenantId, method = 'GET') {
  const response = await fetch(`${urls[service]}${path}`, {
    method,
    headers: { 'x-internal-secret': secret, 'x-tenant-id': tenantId },
    signal: AbortSignal.timeout(30_000),
  })
  const text = await response.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text.slice(0, 500) }
  }
  if (!response.ok) {
    throw new Error(
      `${service} ${method} ${path} returned ${response.status}: ${JSON.stringify(body)}`,
    )
  }
  return body?.data ?? body
}

async function loadState() {
  try {
    return JSON.parse(await readFile(statePath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return { completedTenants: [] }
    throw error
  }
}

async function backfill() {
  const state = await loadState()
  const completed = new Set(state.completedTenants ?? [])
  for (const tenantId of tenants) {
    if (completed.has(tenantId)) {
      process.stdout.write(`${tenantId}: already completed\n`)
      continue
    }
    await request('booking', '/booking-projections/internal/venue/refresh', tenantId, 'POST')
    await request('booking', '/booking-projections/internal/coaching/refresh', tenantId, 'POST')
    const report = await request('booking', '/booking-projections/internal/reconcile', tenantId)
    if (!report.matches) {
      throw new Error(`${tenantId}: reconciliation failed: ${JSON.stringify(report)}`)
    }
    completed.add(tenantId)
    await writeFile(
      statePath,
      `${JSON.stringify(
        { completedTenants: [...completed].sort(), updatedAt: new Date().toISOString() },
        null,
        2,
      )}\n`,
      { mode: 0o600 },
    )
    process.stdout.write(`${tenantId}: backfilled and reconciled\n`)
  }
}

async function run() {
  if (command === 'backfill') return backfill()
  for (const tenantId of tenants) {
    let result
    if (command === 'reconcile') {
      result = await request('booking', '/booking-projections/internal/reconcile', tenantId)
    } else if (command === 'status') {
      result = {
        booking: await request('booking', '/booking-projections/internal/status', tenantId),
        venueOutbox: await request('venue', '/projection-outbox/internal/status', tenantId),
        coachingOutbox: await request('coaching', '/projection-outbox/internal/status', tenantId),
      }
    } else if (command === 'dead-letters') {
      result = await request(source, '/projection-outbox/internal/dead-letters', tenantId)
    } else if (command === 'replay') {
      result = await request(
        source,
        `/projection-outbox/internal/${eventId}/replay`,
        tenantId,
        'POST',
      )
    } else {
      fail(`Unknown command: ${command}`)
    }
    process.stdout.write(`${JSON.stringify({ tenantId, ...result }, null, 2)}\n`)
  }
}

run().catch((error) => fail(error instanceof Error ? error.message : String(error)))
