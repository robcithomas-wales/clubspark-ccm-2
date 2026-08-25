import { afterEach, describe, expect, it, vi } from 'vitest'
import { EventBusService, type DomainEvent } from '../src/event-bus/event-bus.service.js'

describe('payment EventBusService', () => {
  const originalFetch = global.fetch
  const originalCommsUrl = process.env.COMMS_SERVICE_URL
  const originalIntegrationUrl = process.env.INTEGRATION_SERVICE_URL

  afterEach(() => {
    global.fetch = originalFetch
    if (originalCommsUrl === undefined) delete process.env.COMMS_SERVICE_URL
    else process.env.COMMS_SERVICE_URL = originalCommsUrl
    if (originalIntegrationUrl === undefined) delete process.env.INTEGRATION_SERVICE_URL
    else process.env.INTEGRATION_SERVICE_URL = originalIntegrationUrl
    vi.restoreAllMocks()
  })

  it('rejects durable delivery when a subscriber fails', async () => {
    process.env.COMMS_SERVICE_URL = 'http://comms.test'
    process.env.INTEGRATION_SERVICE_URL = 'http://integration.test'
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 202 })
      .mockResolvedValueOnce({ ok: false, status: 503 }) as never
    const event: DomainEvent = {
      type: 'payment.succeeded',
      tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      occurredAt: '2026-08-24T10:00:00.000Z',
    }

    await expect(new EventBusService().publishDurably(event)).rejects.toThrow(
      'http://integration.test/v1/events/inbound returned 503',
    )
  })
})
