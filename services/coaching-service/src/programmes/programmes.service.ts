import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { ProgrammesRepository } from './programmes.repository.js'
import type { CreateProgrammeDto } from './dto/create-programme.dto.js'
import type { UpdateProgrammeDto } from './dto/update-programme.dto.js'
import type { CreateProgrammeSessionDto } from './dto/create-programme-session.dto.js'

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['published', 'cancelled'],
  published: ['closed', 'cancelled'],
  closed: ['ended', 'cancelled'],
  ended: [],
  cancelled: [],
}

@Injectable()
export class ProgrammesService {
  constructor(private readonly repo: ProgrammesRepository) {}

  async list(tenantId: string, page: number, limit: number, filters: { status?: string; sport?: string; coachId?: string }) {
    const { programmes, total } = await this.repo.list(tenantId, page, limit, filters)
    return { data: programmes, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async findById(tenantId: string, id: string) {
    const p = await this.repo.findById(tenantId, id)
    if (!p) throw new NotFoundException('Programme not found')
    return { data: p }
  }

  async create(tenantId: string, dto: CreateProgrammeDto) {
    const p = await this.repo.create(tenantId, dto)
    return { data: p }
  }

  async update(tenantId: string, id: string, dto: UpdateProgrammeDto) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Programme not found')
    if (existing.status !== 'draft') throw new BadRequestException('Only draft programmes can be edited')
    const p = await this.repo.update(tenantId, id, dto)
    return { data: p }
  }

  async transition(tenantId: string, id: string, targetStatus: string) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Programme not found')
    const allowed = VALID_TRANSITIONS[existing.status] ?? []
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(`Cannot transition from ${existing.status} to ${targetStatus}`)
    }
    const p = await this.repo.updateStatus(tenantId, id, targetStatus)
    return { data: p }
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Programme not found')
    if (existing.status !== 'draft') throw new BadRequestException('Only draft programmes can be deleted')
    await this.repo.delete(tenantId, id)
  }

  // Sessions
  async addSession(tenantId: string, programmeId: string, dto: CreateProgrammeSessionDto) {
    const programme = await this.repo.findById(tenantId, programmeId)
    if (!programme) throw new NotFoundException('Programme not found')
    const session = await this.repo.createSession(tenantId, programmeId, dto)
    return { data: session }
  }

  async updateSession(tenantId: string, programmeId: string, sessionId: string, data: { status?: string; notes?: string }) {
    const programme = await this.repo.findById(tenantId, programmeId)
    if (!programme) throw new NotFoundException('Programme not found')
    const session = await this.repo.findSession(tenantId, sessionId)
    if (!session || session.programmeId !== programmeId) throw new NotFoundException('Session not found')
    const updated = await this.repo.updateSession(sessionId, data)
    return { data: updated }
  }

  async deleteSession(tenantId: string, programmeId: string, sessionId: string) {
    const programme = await this.repo.findById(tenantId, programmeId)
    if (!programme) throw new NotFoundException('Programme not found')
    const session = await this.repo.findSession(tenantId, sessionId)
    if (!session || session.programmeId !== programmeId) throw new NotFoundException('Session not found')
    await this.repo.deleteSession(sessionId)
  }
}
