import { Injectable, NotFoundException } from '@nestjs/common'
import { OutboxRepository } from './outbox.repository.js'

@Injectable()
export class OutboxOperationsService {
  constructor(private readonly outbox: OutboxRepository) {}

  async status(tenantId: string) {
    const status = await this.outbox.operationalStatus(tenantId)
    return {
      ...status,
      oldestPendingAgeSeconds: status.oldestPendingAt
        ? Math.max(0, Math.floor((Date.now() - status.oldestPendingAt.getTime()) / 1000))
        : null,
    }
  }

  deadLetters(tenantId: string, limit: number) {
    return this.outbox.deadLetters(tenantId, Math.min(Math.max(limit, 1), 100))
  }

  async replay(tenantId: string, id: string) {
    if (!(await this.outbox.replay(tenantId, id))) {
      throw new NotFoundException('Unpublished outbox event not found')
    }
    return { replayQueued: true, eventId: id }
  }
}
