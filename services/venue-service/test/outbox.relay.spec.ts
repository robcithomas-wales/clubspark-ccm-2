import { describe, expect, it, vi } from 'vitest'
import { OutboxRelay } from '../src/outbox/outbox.relay.js'

/**
 * The relay claims inside a transaction and then publishes OUTSIDE it, so the
 * outcome writes must land on the plain client — not on the claim's `tx`, which
 * has already committed. These tests pin that, because the earlier shape (publish
 * inside the claim transaction) exceeded Prisma's transaction timeout under a slow
 * consumer and rolled the outcome writes back with it, so `attempts` never
 * advanced and nothing ever dead-lettered.
 */
function harness(publishResult: Promise<unknown>) {
  const tx = { marker: 'claim-transaction' }
  const client = { marker: 'client' }
  const prisma = {
    write: {
      ...client,
      $transaction: vi.fn((work: (value: object) => unknown) => work(tx)),
    },
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
  const eventBus = { publish: vi.fn().mockReturnValue(publishResult) }
  return { prisma, outbox, eventBus, row, tx }
}

describe('OutboxRelay', () => {
  it('records a failed delivery so it can be retried', async () => {
    const { prisma, outbox, eventBus, row } = harness(Promise.reject(new Error('unavailable')))

    await new OutboxRelay(prisma as never, outbox as never, eventBus as never).flush()

    expect(outbox.markFailed).toHaveBeenCalledWith(prisma.write, row.id, 0, 'Error: unavailable')
    expect(outbox.markPublished).not.toHaveBeenCalled()
  })

  it('marks a successful delivery as published', async () => {
    const { prisma, outbox, eventBus, row } = harness(Promise.resolve(undefined))

    await new OutboxRelay(prisma as never, outbox as never, eventBus as never).flush()

    expect(outbox.markPublished).toHaveBeenCalledWith(prisma.write, row.id)
    expect(outbox.markFailed).not.toHaveBeenCalled()
  })

  it('claims inside a transaction but publishes outside it', async () => {
    const { prisma, outbox, eventBus, tx } = harness(Promise.resolve(undefined))

    await new OutboxRelay(prisma as never, outbox as never, eventBus as never).flush()

    // The claim is the only thing that runs in the transaction.
    expect(prisma.write.$transaction).toHaveBeenCalledTimes(1)
    expect(outbox.claimBatch).toHaveBeenCalledWith(tx, 50)
    expect(eventBus.publish).toHaveBeenCalledTimes(1)
    expect(outbox.markPublished).not.toHaveBeenCalledWith(tx, expect.anything())
  })
})
