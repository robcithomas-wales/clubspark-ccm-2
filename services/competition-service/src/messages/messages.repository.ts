import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { SendMessageDto } from './dto/send-message.dto.js'

@Injectable()
export class MessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, competitionId: string) {
    return this.prisma.competitionMessage.findMany({
      where: { tenantId, competitionId },
      orderBy: { sentAt: 'desc' },
    })
  }

  async send(
    tenantId: string,
    competitionId: string,
    sentBy: string | undefined,
    dto: SendMessageDto,
    recipientCount: number,
  ) {
    return this.prisma.competitionMessage.create({
      data: {
        tenantId,
        competitionId,
        subject: dto.subject,
        body: dto.body,
        audience: (dto.audience ?? 'ALL_ENTRANTS') as any,
        divisionId: dto.divisionId ?? null,
        sentBy: sentBy ?? null,
        recipientCount,
      },
    })
  }

  /**
   * Counts the recipients for a given audience. Used to set recipientCount.
   */
  async countRecipients(competitionId: string, audience: string, divisionId?: string): Promise<number> {
    const where: any = { competitionId }
    if (audience === 'CONFIRMED_ENTRANTS') where.status = 'CONFIRMED'
    else if (audience === 'PENDING_ENTRANTS') where.status = 'PENDING'
    else if (audience === 'DIVISION' && divisionId) { where.divisionId = divisionId }
    // ALL_ENTRANTS and SPECIFIC: count all non-withdrawn
    if (!where.status && audience !== 'SPECIFIC') {
      where.status = { not: 'WITHDRAWN' }
    }
    return this.prisma.entry.count({ where })
  }
}
