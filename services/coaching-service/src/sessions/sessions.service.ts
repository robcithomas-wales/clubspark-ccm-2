import { Injectable, NotFoundException } from '@nestjs/common'
import { SessionsRepository } from './sessions.repository.js'
import type { CreateSessionDto } from './dto/create-session.dto.js'
import type { UpdateSessionDto } from './dto/update-session.dto.js'

@Injectable()
export class SessionsService {
  constructor(private readonly repo: SessionsRepository) {}

  async list(
    tenantId: string,
    opts: {
      coachId?: string
      lessonTypeId?: string
      customerId?: string
      status?: string
      fromDate?: string
      toDate?: string
      page: number
      limit: number
    },
  ) {
    const { sessions, total } = await this.repo.list(tenantId, opts)
    return {
      data: sessions,
      pagination: {
        total,
        page: opts.page,
        limit: opts.limit,
        totalPages: Math.ceil(total / opts.limit),
      },
    }
  }

  async findById(tenantId: string, id: string) {
    const session = await this.repo.findById(tenantId, id)
    if (!session) throw new NotFoundException('Lesson session not found')
    return { data: session }
  }

  async create(tenantId: string, dto: CreateSessionDto) {
    const session = await this.repo.create(tenantId, dto)
    return { data: session }
  }

  async update(tenantId: string, id: string, dto: UpdateSessionDto) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Lesson session not found')
    const session = await this.repo.update(tenantId, id, dto)
    return { data: session }
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Lesson session not found')
    await this.repo.delete(tenantId, id)
  }
}
