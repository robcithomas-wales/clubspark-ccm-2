import { afterEach, describe, expect, it, vi } from 'vitest'
import { EventBusService, type DomainEvent } from '../src/event-bus/event-bus.service'

describe('membership EventBusService', () => {
  const originalFetch = global.fetch
  const originalSecret = process.env.INTERNAL_SECRET
  const originalCommsUrl = process.env.COMMS_SERVICE_URL
  const originalIntegrationUrl = process.env.INTEGRATION_SERVICE_URL

  afterEach(() => {
    global.fetch = originalFetch
    if (originalSecret === undefined) delete process.env.INTERNAL_SECRET
    else process.env.INTERNAL_SECRET = originalSecret
    if (originalCommsUrl === undefined) delete process.env.COMMS_SERVICE_URL
    else process.env.COMMS_SERVICE_URL = originalCommsUrl
    if (originalIntegrationUrl === undefined) delete process.env.INTEGRATION_SERVICE_URL
    else process.env.INTEGRATION_SERVICE_URL = originalIntegrationUrl
    vi.restoreAllMocks()
  })

  const event: DomainEvent = {
    type: 'membership.renewal_due',
    tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    occurredAt: '2026-08-24T10:00:00.000Z',
    membershipId: '11111111-1111-4111-8111-111111111111',
  }

  it('rejects durable delivery when any subscriber fails so the outbox retries', async () => {
    process.env.COMMS_SERVICE_URL = 'http://comms.test'
    process.env.INTEGRATION_SERVICE_URL = 'http://integration.test'
    process.env.INTERNAL_SECRET = 'test-secret'
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 202 })
      .mockResolvedValueOnce({ ok: false, status: 503 }) as never

    await expect(new EventBusService().publishDurably(event)).rejects.toThrow(
      'http://integration.test/v1/events/inbound returned 503',
    )

    expect(global.fetch).toHaveBeenCalledWith(
      'http://comms.test/v1/events/inbound',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': 'test-secret',
        },
      }),
    )
  })
})
