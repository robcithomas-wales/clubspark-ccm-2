import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

export interface CreateMessageLogDto {
  tenantId: string
  recipientEmail?: string
  recipientName?: string
  recipientPhone?: string
  recipientPersonId?: string
  channel: string
  templateKey?: string
  subject?: string
  bodyPreview?: string
  status?: string
  sourceEventType?: string
  sourceEntityId?: string
  sourceModule?: string
  campaignId?: string
}

@Injectable()
export class MessageLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMessageLogDto) {
    return this.prisma.write.messageLog.create({ data: dto })
  }

  async updateStatus(
    id: string,
    status: string,
    providerMessageId?: string,
    errorDetail?: string,
  ) {
    return this.prisma.write.messageLog.update({
      where: { id },
      data: {
        status,
        providerMessageId,
        errorDetail,
        sentAt: status === 'sent' ? new Date() : undefined,
      },
    })
  }

  /** Called by the provider webhook controller to record engagement events */
  async updateEngagement(
    providerMessageId: string,
    event: 'delivered' | 'opened' | 'clicked' | 'bounced',
  ) {
    const data: Record<string, unknown> = {}
    if (event === 'delivered') data['deliveredAt'] = new Date()
    if (event === 'opened') data['openedAt'] = new Date()
    if (event === 'clicked') data['clickedAt'] = new Date()
    if (event === 'bounced') {
      data['bouncedAt'] = new Date()
      data['status'] = 'bounced'
    }
    return this.prisma.write.messageLog.updateMany({
      where: { providerMessageId },
      data,
    })
  }

  findByTenant(tenantId: string, limit = 100, offset = 0) {
    return this.prisma.read.messageLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  countByTenant(tenantId: string) {
    return this.prisma.read.messageLog.count({ where: { tenantId } })
  }
}
