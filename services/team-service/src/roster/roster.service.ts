import { Injectable, NotFoundException } from '@nestjs/common'
import { RosterRepository } from './roster.repository.js'
import type { CreateMemberDto } from './dto/create-member.dto.js'
import type { UpdateMemberDto } from './dto/update-member.dto.js'

@Injectable()
export class RosterService {
  constructor(private readonly repo: RosterRepository) {}

  async list(tenantId: string, teamId: string, activeOnly = true) {
    const members = await this.repo.list(tenantId, teamId, activeOnly)
    return { data: members, pagination: { total: members.length } }
  }

  async findById(tenantId: string, teamId: string, id: string) {
    const member = await this.repo.findById(tenantId, teamId, id)
    if (!member) throw new NotFoundException('Team member not found')
    return { data: member }
  }

  async create(tenantId: string, teamId: string, dto: CreateMemberDto) {
    const member = await this.repo.create(tenantId, teamId, dto)
    return { data: member }
  }

  async update(tenantId: string, teamId: string, id: string, dto: UpdateMemberDto) {
    const existing = await this.repo.findById(tenantId, teamId, id)
    if (!existing) throw new NotFoundException('Team member not found')
    const member = await this.repo.update(tenantId, teamId, id, dto)
    return { data: member }
  }

  async remove(tenantId: string, teamId: string, id: string) {
    const existing = await this.repo.findById(tenantId, teamId, id)
    if (!existing) throw new NotFoundException('Team member not found')
    await this.repo.remove(tenantId, teamId, id)
    return { data: { success: true } }
  }
}
