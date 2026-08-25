import { describe, expect, it, vi } from 'vitest'
import { OutboxRelay } from '../src/outbox/outbox.relay.js'

describe('OutboxRelay', () => {
  it('records a failed delivery for retry', async () => {
    const tx = {}
    const prisma = { $transaction: vi.fn((work: (value: object) => unknown) => work(tx)) }
    const row = { id: 'event', payload: { type: 'coaching.occupancy.upserted.v1' }, attempts: 0 }
    const outbox = {
      claimBatch: vi.fn().mockResolvedValue([row]),
      markPublished: vi.fn(),
      markFailed: vi.fn(),
    }
    const events = { publish: vi.fn().mockRejectedValue(new Error('unavailable')) }
    await new OutboxRelay(prisma as never, outbox as never, events as never).flush()
    expect(outbox.markFailed).toHaveBeenCalledWith(tx, row.id, 0, 'Error: unavailable')
    expect(outbox.markPublished).not.toHaveBeenCalled()
  })
})
