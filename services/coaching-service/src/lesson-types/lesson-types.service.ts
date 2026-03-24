import { Injectable, NotFoundException } from '@nestjs/common'
import { LessonTypesRepository } from './lesson-types.repository.js'
import type { CreateLessonTypeDto } from './dto/create-lesson-type.dto.js'
import type { UpdateLessonTypeDto } from './dto/update-lesson-type.dto.js'

@Injectable()
export class LessonTypesService {
  constructor(private readonly repo: LessonTypesRepository) {}

  async list(tenantId: string, page: number, limit: number, sport?: string, activeOnly?: boolean) {
    const { lessonTypes, total } = await this.repo.list(tenantId, page, limit, sport, activeOnly)
    return {
      data: lessonTypes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findById(tenantId: string, id: string) {
    const lt = await this.repo.findById(tenantId, id)
    if (!lt) throw new NotFoundException('Lesson type not found')
    return { data: lt }
  }

  async create(tenantId: string, dto: CreateLessonTypeDto) {
    const lt = await this.repo.create(tenantId, dto)
    return { data: lt }
  }

  async update(tenantId: string, id: string, dto: UpdateLessonTypeDto) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Lesson type not found')
    await this.repo.update(tenantId, id, dto)
    return this.findById(tenantId, id)
  }
}
