import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service.js'
import { SendRulesService } from '../send-rules/send-rules.service.js'
import { TemplatesService } from '../templates/templates.service.js'
import { EmailDeliveryService } from '../delivery/email-delivery.service.js'
import { MessageLogRepository } from '../message-log/message-log.repository.js'
import type { AppConfig } from '../config/configuration.js'

export interface CreateCampaignDto {
  name?: string
  channel: 'email' | 'sms'
  subject?: string
  body?: string
  replyTo?: string
  audienceDefinition: string // JSON
  scheduledAt?: string // ISO — Premium scheduling
}

/**
 * Campaigns Service
 * ─────────────────
 * Handles user-initiated bulk sends (Core: immediate / Premium: scheduled).
 *
 * Audience resolution:
 *   The audienceDefinition JSON is passed to resolveAudience(), which calls
 *   the appropriate downstream service APIs to build the recipient list.
 *   Currently supports: all_active_members, manual (explicit email list).
 *
 *   TODO (Premium - Advanced segmentation):
 *     Add AND/OR filter builder. Call membership-service, booking-service,
 *     people-service in parallel and intersect/union the results.
 *     Store saved audience definitions in comms.saved_audiences table.
 *
 * Scheduling (Premium):
 *   scheduledAt is persisted on the Campaign record.
 *   A @Cron job (CampaignsScheduler) polls for due campaigns every minute
 *   and calls dispatch().
 *
 *   TODO: in production, use Azure Service Bus scheduled messages instead of
 *   polling. Set scheduledEnqueueTime on the message when creating the campaign.
 *   This eliminates the polling overhead and gives millisecond-accurate delivery.
 */
@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name)

  private readonly peopleServiceUrl: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly sendRules: SendRulesService,
    private readonly templates: TemplatesService,
    private readonly emailDelivery: EmailDeliveryService,
    private readonly messageLog: MessageLogRepository,
    config: ConfigService<AppConfig, true>,
  ) {
    this.peopleServiceUrl = config.get('peopleService', { infer: true }).url
  }

  async create(tenantId: string, createdBy: string, dto: CreateCampaignDto) {
    const campaign = await this.prisma.write.campaign.create({
      data: {
        tenantId,
        createdBy,
        name: dto.name,
        channel: dto.channel,
        subject: dto.subject,
        body: dto.body,
        replyTo: dto.replyTo,
        audienceDefinition: dto.audienceDefinition,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: dto.scheduledAt ? 'scheduled' : 'draft',
      },
    })

    // Immediate send — dispatch now
    if (!dto.scheduledAt) {
      await this.dispatch(campaign.id)
    }

    return campaign
  }

  async findAll(tenantId: string) {
    return this.prisma.read.campaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.read.campaign.findFirst({ where: { id, tenantId } })
  }

  async update(
    tenantId: string,
    id: string,
    dto: {
      name?: string
      subject?: string
      body?: string
      replyTo?: string
      audienceDefinition?: string
      scheduledAt?: string
      status?: string
    },
  ) {
    const existing = await this.prisma.read.campaign.findFirst({ where: { id, tenantId } })
    if (!existing) throw new Error('Campaign not found')

    const updated = await this.prisma.write.campaign.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name ?? undefined,
        subject: dto.subject ?? existing.subject ?? undefined,
        body: dto.body ?? existing.body ?? undefined,
        replyTo: dto.replyTo ?? existing.replyTo ?? undefined,
        audienceDefinition: dto.audienceDefinition ?? existing.audienceDefinition ?? undefined,
        scheduledAt:
          dto.scheduledAt !== undefined
            ? dto.scheduledAt
              ? new Date(dto.scheduledAt)
              : null
            : existing.scheduledAt,
        // `sent` is an action request, not a state the update endpoint may stamp
        // before dispatch has claimed the campaign. Stamping it first caused
        // dispatch() to return without sending anything.
        status: dto.status === 'sent' ? existing.status : (dto.status ?? existing.status),
      },
    })

    // If updating status to 'sent' (immediate), dispatch
    if (dto.status === 'sent' && existing.status !== 'sent') {
      await this.dispatch(id)
    }

    return { data: updated }
  }

  /**
   * Returns an estimated recipient count for an audience without dispatching.
   * Used by the compose form "Preview recipients" button.
   */
  async previewRecipients(
    tenantId: string,
    audienceType: string,
    segmentId?: string,
    manualCount?: number,
  ) {
    let total = 0

    if (audienceType === 'manual') {
      total = manualCount ?? 0
    } else if (audienceType === 'segment' && segmentId) {
      const recipients = await this.resolveSegmentAudience(tenantId, segmentId)
      total = recipients.length
    } else {
      const recipients = await this.resolveAllActiveMembers(tenantId)
      total = recipients.length
    }

    // Estimate suppressed: fetch suppression list count
    const suppressedCount = await this.prisma.read.suppression.count({
      where: { tenantId },
    })
    const excluded = Math.min(suppressedCount, total)

    return {
      data: {
        total,
        excluded,
        eligible: Math.max(0, total - excluded),
      },
    }
  }

  /**
   * Per-campaign analytics: aggregated from the message log.
   */
  async getStats(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.read.campaign.findFirst({
      where: { id: campaignId, tenantId },
    })
    if (!campaign) throw new Error('Campaign not found')

    const logs = await this.prisma.read.messageLog.findMany({
      where: { campaignId, tenantId },
      select: { status: true, openedAt: true, clickedAt: true, deliveredAt: true, bouncedAt: true },
    })

    const total = logs.length
    const sent = logs.filter((l) => l.status === 'sent' || l.status === 'delivered').length
    const delivered = logs.filter((l) => l.deliveredAt !== null).length
    const opened = logs.filter((l) => l.openedAt !== null).length
    const clicked = logs.filter((l) => l.clickedAt !== null).length
    const bounced = logs.filter((l) => l.bouncedAt !== null).length
    const suppressed = logs.filter((l) => l.status === 'suppressed').length

    return {
      data: {
        campaignId,
        name: campaign.name,
        status: campaign.status,
        channel: campaign.channel,
        sentAt: campaign.sentAt,
        total,
        sent,
        delivered,
        opened,
        clicked,
        bounced,
        suppressed,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
        deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
        bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
      },
    }
  }

  async findDue(): Promise<{ id: string; tenantId: string }[]> {
    return this.prisma.read.campaign.findMany({
      where: { status: 'scheduled', scheduledAt: { lte: new Date() } },
      select: { id: true, tenantId: true },
    })
  }

  async dispatch(campaignId: string): Promise<void> {
    // Atomic state transition is the replica-safe claim. Two schedulers may
    // discover the same due row, but only one can change scheduled/draft to
    // sending; the other receives count=0 and performs no side effects.
    const claimed = await this.prisma.write.campaign.updateMany({
      where: { id: campaignId, status: { in: ['draft', 'scheduled'] } },
      data: { status: 'sending' },
    })
    if (claimed.count === 0) return

    // Read through the writer after the claim so a future read replica cannot
    // return the pre-claim status or lag a newly created campaign.
    const campaign = await this.prisma.write.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    })

    // Resolve audience
    const recipients = await this.resolveAudience(
      campaign.tenantId,
      campaign.audienceDefinition ?? '{"type":"manual","emails":[]}',
    )

    this.logger.log(`Dispatching campaign ${campaignId} to ${recipients.length} recipients`)

    let sentCount = 0
    let suppressedCount = 0

    for (const recipient of recipients) {
      const rules = await this.sendRules.evaluate(
        campaign.tenantId,
        campaign.channel as 'email' | 'sms',
        {
          email: recipient.email,
          firstName: recipient.firstName,
          isTransactional: false, // campaigns are always marketing
        },
      )

      const log = await this.messageLog.create({
        tenantId: campaign.tenantId,
        recipientEmail: rules.resolvedEmail ?? recipient.email,
        recipientName: rules.resolvedName ?? recipient.firstName,
        channel: campaign.channel,
        subject: campaign.subject ?? undefined,
        status: rules.eligible ? 'queued' : 'suppressed',
        sourceModule: 'manual',
        campaignId: campaign.id,
      })

      if (!rules.eligible) {
        suppressedCount++
        continue
      }

      let htmlBody = campaign.body ?? ''

      // If campaign references a template, render it
      if (campaign.templateId) {
        try {
          const rendered = await this.templates.render(campaign.tenantId, campaign.templateId, {
            firstName: recipient.firstName ?? '',
          })
          htmlBody = rendered.htmlBody
        } catch {
          /* fall through to raw body */
        }
      }

      await this.emailDelivery.send({
        messageLogId: log.id,
        to: rules.resolvedEmail!,
        toName: rules.resolvedName,
        subject: campaign.subject ?? '(no subject)',
        htmlBody,
        replyTo: campaign.replyTo ?? undefined,
      })

      sentCount++
    }

    await this.prisma.write.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'sent',
        sentAt: new Date(),
        sentCount,
        suppressedCount,
        recipientCount: recipients.length,
      },
    })

    this.logger.log(
      `Campaign ${campaignId} complete — sent: ${sentCount}, suppressed: ${suppressedCount}`,
    )
  }

  /**
   * Resolves an audience definition to a flat list of recipients.
   *
   * TODO (Premium): extend with AND/OR filter builder calling:
   *   - people-service  GET /v1/people?membershipStatus=active
   *   - booking-service GET /v1/bookings?from=...&to=...
   *   - team-service    GET /v1/teams/:id/members
   *   Merge and deduplicate by email.
   */
  private async resolveAudience(
    tenantId: string,
    audienceJson: string,
  ): Promise<{ email?: string; phone?: string; firstName?: string }[]> {
    try {
      const def = JSON.parse(audienceJson) as {
        type: string
        emails?: string[]
        phones?: string[]
        recipients?: { email?: string; phone?: string; firstName?: string }[]
        segmentId?: string
      }

      if (def.type === 'manual' && def.recipients) {
        return def.recipients
      }

      if (def.type === 'manual' && def.emails) {
        return def.emails.map((email) => ({ email }))
      }

      if (def.type === 'segment' && def.segmentId) {
        return this.resolveSegmentAudience(tenantId, def.segmentId)
      }

      if (def.type === 'all_active_members') {
        return this.resolveAllActiveMembers(tenantId)
      }

      this.logger.warn(`Unresolved audience type: ${def.type} — returning empty list`)
      return []
    } catch {
      this.logger.error(`Invalid audienceDefinition JSON for campaign`)
      return []
    }
  }

  private async resolveSegmentAudience(
    tenantId: string,
    segmentId: string,
  ): Promise<{ email?: string; phone?: string; firstName?: string }[]> {
    try {
      const res = await fetch(`${this.peopleServiceUrl}/segments/${segmentId}/members`, {
        headers: { 'x-tenant-id': tenantId },
      })
      if (!res.ok) {
        this.logger.warn(`Failed to fetch segment members for ${segmentId}: ${res.status}`)
        return []
      }
      const json = (await res.json()) as {
        data?: { email?: string; phone?: string; firstName?: string; first_name?: string }[]
      }
      return (json.data ?? []).map((m) => ({
        email: m.email,
        phone: m.phone,
        firstName: m.firstName ?? m.first_name,
      }))
    } catch (err) {
      this.logger.error(`Error fetching segment members for ${segmentId}: ${String(err)}`)
      return []
    }
  }

  private async resolveAllActiveMembers(
    tenantId: string,
  ): Promise<{ email?: string; phone?: string; firstName?: string }[]> {
    try {
      const res = await fetch(`${this.peopleServiceUrl}/people?lifecycle=active&limit=1000`, {
        headers: { 'x-tenant-id': tenantId },
      })
      if (!res.ok) {
        this.logger.warn(`Failed to fetch active members: ${res.status}`)
        return []
      }
      const json = (await res.json()) as {
        data?: { email?: string; phone?: string; firstName?: string; first_name?: string }[]
      }
      return (json.data ?? []).map((p) => ({
        email: p.email,
        phone: p.phone,
        firstName: p.firstName ?? p.first_name,
      }))
    } catch (err) {
      this.logger.error(`Error fetching active members: ${String(err)}`)
      return []
    }
  }
}
