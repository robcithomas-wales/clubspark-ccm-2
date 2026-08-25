import { describe, expect, it, vi } from 'vitest'
import { OutboxRelay } from '../src/outbox/outbox.relay.js'

describe('OutboxRelay', () => {
  it('records a failed delivery so it can be retried', async () => {
    const tx = {}
    const prisma = {
      write: { $transaction: vi.fn((work: (value: object) => unknown) => work(tx)) },
    }
    const row = {
      id: '11111111-1111-4111-8111-111111111111',
      eventType: 'venue.resource.upserted.v1',
      payload: { type: 'venue.resource.upserted.v1' },
      attempts: 0,
    }
    const outbox = {
      claimBatch: vi.fn().mockResolvedValue([row]),
      markPublished: vi.fn(),
      markFailed: vi.fn(),
    }
    const eventBus = { publish: vi.fn().mockRejectedValue(new Error('unavailable')) }

    await new OutboxRelay(prisma as never, outbox as never, eventBus as never).flush()

    expect(outbox.markFailed).toHaveBeenCalledWith(tx, row.id, 0, 'Error: unavailable')
    expect(outbox.markPublished).not.toHaveBeenCalled()
  })

  it('marks a successful delivery as published', async () => {
    const tx = {}
    const prisma = {
      write: { $transaction: vi.fn((work: (value: object) => unknown) => work(tx)) },
    }
    const row = {
      id: '11111111-1111-4111-8111-111111111111',
      eventType: 'venue.resource.upserted.v1',
      payload: { type: 'venue.resource.upserted.v1' },
      attempts: 0,
    }
    const outbox = {
      claimBatch: vi.fn().mockResolvedValue([row]),
      markPublished: vi.fn(),
      markFailed: vi.fn(),
    }
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) }

    await new OutboxRelay(prisma as never, outbox as never, eventBus as never).flush()

    expect(outbox.markPublished).toHaveBeenCalledWith(tx, row.id)
    expect(outbox.markFailed).not.toHaveBeenCalled()
  })
})
