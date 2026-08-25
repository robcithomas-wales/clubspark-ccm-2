import { describe, expect, it, vi } from 'vitest'
import { OutboxRelay } from '../src/outbox/outbox.relay.js'

describe('OutboxRelay', () => {
  // The claim runs in a transaction; the publish and the outcome write do not —
  // holding the transaction open across the HTTP fan-out exceeded Prisma's
  // transaction timeout and rolled back the outcome with it.
  const harness = (publish: Promise<unknown>) => {
    const tx = { marker: 'claim-transaction' }
    const prisma = {
      marker: 'client',
      $transaction: vi.fn((work: (value: object) => unknown) => work(tx)),
    }
    const row = { id: 'event', payload: { type: 'coaching.occupancy.upserted.v1' }, attempts: 0 }
    const outbox = {
      claimBatch: vi.fn().mockResolvedValue([row]),
      markPublished: vi.fn(),
      markFailed: vi.fn(),
    }
    const events = { publish: vi.fn().mockReturnValue(publish) }
    return { prisma, outbox, events, row, tx }
  }

  it('records a failed delivery for retry', async () => {
    const { prisma, outbox, events, row } = harness(Promise.reject(new Error('unavailable')))
    await new OutboxRelay(prisma as never, outbox as never, events as never).flush()
    expect(outbox.markFailed).toHaveBeenCalledWith(prisma, row.id, 0, 'Error: unavailable')
    expect(outbox.markPublished).not.toHaveBeenCalled()
  })

  it('claims in a transaction and publishes outside it', async () => {
    const { prisma, outbox, events, row, tx } = harness(Promise.resolve(undefined))
    await new OutboxRelay(prisma as never, outbox as never, events as never).flush()
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(outbox.claimBatch).toHaveBeenCalledWith(tx, 50)
    expect(events.publish).toHaveBeenCalledTimes(1)
    expect(outbox.markPublished).toHaveBeenCalledWith(prisma, row.id)
  })
})
