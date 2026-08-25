import { afterEach, describe, expect, it, vi } from 'vitest'
import { WebhookDeliveriesService } from '../src/webhook-deliveries/webhook-deliveries.service.js'

describe('WebhookDeliveriesService worker', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uses the atomic lease claim and marks a successful delivery', async () => {
    const delivery = {
      id: '11111111-1111-4111-8111-111111111111',
      subscriptionId: '22222222-2222-4222-8222-222222222222',
      eventType: 'booking.confirmed',
      payload: { bookingId: 'booking-1' },
      attempts: 0,
      subscription: {
        endpointUrl: 'https://example.test/webhook',
        secretHash: 'secret',
      },
    }
    const deliveriesRepo = {
      claimPending: vi.fn().mockResolvedValue([delivery]),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    }
    const service = new WebhookDeliveriesService(deliveriesRepo as never, {} as never)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('ok') }),
    )

    await service.processPending()

    expect(deliveriesRepo.claimPending).toHaveBeenCalledWith(50, 30)
    expect(deliveriesRepo.updateStatus).toHaveBeenCalledWith(
      delivery.id,
      expect.objectContaining({ status: 'delivered', attempts: 1, nextRetryAt: null }),
    )
  })

  it('does nothing when another replica has already claimed the due rows', async () => {
    const deliveriesRepo = {
      claimPending: vi.fn().mockResolvedValue([]),
      updateStatus: vi.fn(),
    }
    const service = new WebhookDeliveriesService(deliveriesRepo as never, {} as never)

    await service.processPending()

    expect(deliveriesRepo.updateStatus).not.toHaveBeenCalled()
  })
})
