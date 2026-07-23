import { Injectable, NotFoundException } from '@nestjs/common'
import { SegmentsRepository } from './segments.repository.js'
import type { CreateSegmentDto } from './dto/create-segment.dto.js'

@Injectable()
export class SegmentsService {
  constructor(private readonly repo: SegmentsRepository) {}

  async list(tenantId: string) {
    return { data: await this.repo.list(tenantId) }
  }

  async findById(tenantId: string, id: string) {
    const segment = await this.repo.findById(tenantId, id)
    if (!segment) throw new NotFoundException('Segment not found')
    return { data: segment }
  }

  async create(tenantId: string, dto: CreateSegmentDto) {
    const segment = await this.repo.create(tenantId, dto)
    return { data: segment }
  }

  async update(tenantId: string, id: string, dto: Partial<CreateSegmentDto>) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Segment not found')
    const updated = await this.repo.update(tenantId, id, dto)
    return { data: updated }
  }

  async listMembers(tenantId: string, segmentId: string) {
    const segment = await this.repo.findById(tenantId, segmentId)
    if (!segment) throw new NotFoundException('Segment not found')
    return { data: await this.repo.listMembers(tenantId, segmentId) }
  }

  async addMember(tenantId: string, segmentId: string, personId: string) {
    const segment = await this.repo.findById(tenantId, segmentId)
    if (!segment) throw new NotFoundException('Segment not found')
    await this.repo.addMember(tenantId, segmentId, personId)
  }

  async removeMember(tenantId: string, segmentId: string, personId: string) {
    const segment = await this.repo.findById(tenantId, segmentId)
    if (!segment) throw new NotFoundException('Segment not found')
    const removed = await this.repo.removeMember(tenantId, segmentId, personId)
    if (!removed) throw new NotFoundException('Person not in segment')
  }

  async rebuild(tenantId: string, segmentId: string) {
    const segment = await this.repo.findById(tenantId, segmentId)
    if (!segment) throw new NotFoundException('Segment not found')
    if (segment.type !== 'dynamic') {
      return { rebuilt: 0, message: 'Static segments cannot be rebuilt automatically' }
    }
    const conditions = Array.isArray(segment.conditions) ? segment.conditions as Array<{ field: string; op: string; value: unknown }> : []
    const rebuilt = await this.repo.rebuildDynamic(tenantId, segmentId, conditions)
    return { rebuilt, message: `Segment rebuilt with ${rebuilt} new members` }
  }
}
