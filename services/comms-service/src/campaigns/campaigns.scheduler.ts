import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { CampaignsService } from './campaigns.service.js'

/**
 * Campaigns Scheduler — Premium scheduling support
 * ─────────────────────────────────────────────────
 * Polls every minute for campaigns with scheduledAt <= now and dispatches them.
 *
 * This is the pilot approach. In production on Azure, replace with:
 *
 *   Azure Service Bus Scheduled Messages:
 *   ──────────────────────────────────────
 *   When a campaign is created with scheduledAt, enqueue a scheduled message:
 *
 *   const sender = serviceBusClient.createSender('comms-scheduled-campaigns')
 *   await sender.sendMessages({
 *     body: { campaignId },
 *     scheduledEnqueueTime: new Date(dto.scheduledAt),
 *   })
 *
 *   comms-service then subscribes to 'comms-scheduled-campaigns' and calls
 *   campaignsService.dispatch(message.body.campaignId) when the message arrives.
 *
 *   This is more accurate, scalable, and eliminates polling overhead entirely.
 */
@Injectable()
export class CampaignsScheduler {
  private readonly logger = new Logger(CampaignsScheduler.name)

  constructor(private readonly campaigns: CampaignsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchDueCampaigns(): Promise<void> {
    const due = await this.campaigns.findDue()
    if (due.length === 0) return

    this.logger.log(`Dispatching ${due.length} scheduled campaign(s)`)
    for (const c of due) {
      await this.campaigns.dispatch(c.id)
    }
  }
}
