import { describe, expect, it, vi } from 'vitest'
import { CampaignsService } from '../src/campaigns/campaigns.service.js'

describe('CampaignsService replica-safe dispatch', () => {
  it('allows only one concurrent caller to dispatch a campaign', async () => {
    const campaign = {
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      status: 'sending',
      channel: 'email',
      audienceDefinition: '{"type":"manual","emails":[]}',
      templateId: null,
      body: '',
      subject: 'Test',
      replyTo: null,
    }
    const updateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
    const finalUpdate = vi.fn().mockResolvedValue(campaign)
    const prisma = {
      write: {
        campaign: {
          updateMany,
          findUniqueOrThrow: vi.fn().mockResolvedValue(campaign),
          update: finalUpdate,
        },
      },
    }
    const service = new CampaignsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { get: vi.fn().mockReturnValue({ url: 'http://people.test' }) } as never,
    )

    await Promise.all([service.dispatch(campaign.id), service.dispatch(campaign.id)])

    expect(updateMany).toHaveBeenCalledTimes(2)
    expect(prisma.write.campaign.findUniqueOrThrow).toHaveBeenCalledOnce()
    expect(finalUpdate).toHaveBeenCalledOnce()
  })
})
