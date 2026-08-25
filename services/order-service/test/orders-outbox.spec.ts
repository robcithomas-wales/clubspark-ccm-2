import { describe, expect, it, vi } from 'vitest'
import { OrdersService } from '../src/orders/orders.service.js'
import { OutboxRelay } from '../src/outbox/outbox.relay.js'
import { OrdersRepository } from '../src/orders/orders.repository.js'

describe('Order transactional outbox', () => {
  it('records order.created through the repository transaction callback', async () => {
    const tx = { marker: 'transaction' }
    const order = {
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      subjectType: 'membership',
      subjectId: '22222222-2222-4222-8222-222222222222',
      totalAmount: 2500,
      currency: 'GBP',
      items: [],
    }
    const repo = {
      create: vi.fn(async (_tenantId, _organisationId, _dto, withinTx) => {
        await withinTx(tx, order)
        return order
      }),
    }
    const outbox = { enqueue: vi.fn().mockResolvedValue(undefined) }
    const service = new OrdersService(repo as never, outbox as never)

    await service.create(order.tenantId, undefined, {
      items: [{ productType: 'membership', description: 'Annual membership', unitAmount: 2500 }],
    })

    expect(outbox.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        type: 'order.created',
        tenantId: order.tenantId,
        orderId: order.id,
      }),
    )
  })

  it('adds a stable v1 envelope and only marks a successfully delivered row published', async () => {
    const tx = { marker: 'transaction' }
    const row = {
      id: '33333333-3333-4333-8333-333333333333',
      eventType: 'order.confirmed',
      attempts: 0,
      payload: {
        type: 'order.confirmed',
        tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        occurredAt: '2026-08-24T10:00:00.000Z',
      },
    }
    // The claim runs in `tx`; the publish and the outcome write run on the plain
    // client, after it has committed.
    const prisma = {
      write: { marker: 'client', $transaction: vi.fn(async (work) => work(tx)) },
    }
    const outbox = {
      claimBatch: vi.fn().mockResolvedValue([row]),
      markPublished: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
    }
    const events = { publishDurably: vi.fn().mockResolvedValue(undefined) }
    const relay = new OutboxRelay(prisma as never, outbox as never, events as never)

    await relay.flush()

    expect(events.publishDurably).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: row.id,
        correlationId: row.id,
        schemaVersion: 1,
        producer: 'order-service',
      }),
    )
    expect(outbox.claimBatch).toHaveBeenCalledWith(tx, 50)
    expect(outbox.markPublished).toHaveBeenCalledWith(prisma.write, row.id)
    expect(outbox.markFailed).not.toHaveBeenCalled()
  })

  it('returns the winning order when concurrent requests race on one idempotency key', async () => {
    const winner = {
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      items: [],
    }
    const prisma = {
      write: {
        $transaction: vi.fn().mockRejectedValue({ code: 'P2002' }),
        order: { findUnique: vi.fn().mockResolvedValue(winner) },
      },
    }
    const repository = new OrdersRepository(prisma as never)
    const withinTx = vi.fn()

    await expect(
      repository.create(
        winner.tenantId,
        undefined,
        {
          idempotencyKey: 'checkout-1',
          items: [{ productType: 'membership', description: 'Annual', unitAmount: 2500 }],
        },
        withinTx,
      ),
    ).resolves.toBe(winner)

    expect(withinTx).not.toHaveBeenCalled()
  })
})
