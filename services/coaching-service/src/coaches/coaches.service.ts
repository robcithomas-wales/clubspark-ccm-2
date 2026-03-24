import { Injectable, NotFoundException } from '@nestjs/common'
import { CoachesRepository } from './coaches.repository.js'
import type { CreateCoachDto } from './dto/create-coach.dto.js'
import type { UpdateCoachDto } from './dto/update-coach.dto.js'

@Injectable()
export class CoachesService {
  constructor(private readonly repo: CoachesRepository) {}

  async list(tenantId: string, page: number, limit: number, activeOnly: boolean) {
    const { coaches, total } = await this.repo.list(tenantId, page, limit, activeOnly)
    return {
      data: coaches,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findById(tenantId: string, id: string) {
    const coach = await this.repo.findById(tenantId, id)
    if (!coach) throw new NotFoundException('Coach not found')
    return { data: coach }
  }

  async create(tenantId: string, dto: CreateCoachDto) {
    const coach = await this.repo.create(tenantId, dto)
    return { data: coach }
  }

  async update(tenantId: string, id: string, dto: UpdateCoachDto) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Coach not found')
    const coach = await this.repo.update(tenantId, id, dto)
    return { data: coach }
  }
}
