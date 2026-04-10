import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { MessagesRepository } from './messages.repository.js'
import type { SendMessageDto } from './dto/send-message.dto.js'

@Injectable()
export class MessagesService {
  constructor(
    private readonly repo: MessagesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(tenantId: string, competitionId: string) {
    // Verify competition exists within tenant
    const comp = await this.prisma.competition.findFirst({ where: { id: competitionId, tenantId } })
    if (!comp) throw new NotFoundException('Competition not found')
    return { data: await this.repo.list(tenantId, competitionId) }
  }

  async send(tenantId: string, competitionId: string, sentBy: string | undefined, dto: SendMessageDto) {
    const comp = await this.prisma.competition.findFirst({ where: { id: competitionId, tenantId } })
    if (!comp) throw new NotFoundException('Competition not found')

    const recipientCount = await this.repo.countRecipients(
      competitionId,
      dto.audience ?? 'ALL_ENTRANTS',
      dto.divisionId,
    )

    const message = await this.repo.send(tenantId, competitionId, sentBy, dto, recipientCount)

    // NOTE: Actual delivery (email / push) is out of scope for this service.
    // The message record serves as the source of truth. A future notification-service
    // can subscribe to an event or poll this table to dispatch messages.

    return { data: message }
  }
}
