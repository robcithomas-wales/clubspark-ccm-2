import { describe, expect, it, vi } from 'vitest'
import { SessionsRepository } from '../src/sessions/sessions.repository.js'

describe('SessionsRepository projection outbox', () => {
  const tenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const session = {
    id: '11111111-1111-4111-8111-111111111111',
    tenantId,
    bookableUnitId: '22222222-2222-4222-8222-222222222222',
    startsAt: new Date('2026-08-24T10:00:00.000Z'),
    endsAt: new Date('2026-08-24T11:00:00.000Z'),
    status: 'scheduled',
    updatedAt: new Date('2026-08-24T09:00:00.000Z'),
  }

  it('commits session creation and its complete occupancy event in one transaction', async () => {
    const tx = { lessonSession: { create: vi.fn().mockResolvedValue(session) } }
    const prisma = { $transaction: vi.fn((work: (value: object) => unknown) => work(tx)) }
    const outbox = { enqueue: vi.fn() }
    const repository = new SessionsRepository(prisma as never, outbox as never)

    await repository.create(tenantId, {
      coachId: '33333333-3333-4333-8333-333333333333',
      lessonTypeId: '44444444-4444-4444-8444-444444444444',
      bookableUnitId: session.bookableUnitId,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
    })

    expect(outbox.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        type: 'coaching.occupancy.upserted.v1',
        tenantId,
        sourceUpdatedAt: session.updatedAt.toISOString(),
        data: expect.objectContaining({ id: session.id, bookableUnitId: session.bookableUnitId }),
      }),
    )
  })

  it('writes a deletion tombstone in the same transaction', async () => {
    const tx = { lessonSession: { delete: vi.fn().mockResolvedValue(session) } }
    const prisma = { $transaction: vi.fn((work: (value: object) => unknown) => work(tx)) }
    const outbox = { enqueue: vi.fn() }
    const repository = new SessionsRepository(prisma as never, outbox as never)

    await repository.delete(tenantId, session.id)

    expect(outbox.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        type: 'coaching.occupancy.deleted.v1',
        tenantId,
        data: { id: session.id },
      }),
    )
  })
})
