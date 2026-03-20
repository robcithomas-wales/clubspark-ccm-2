import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { TagsRepository } from './tags.repository.js'
import type { CreateTagDto } from './dto/create-tag.dto.js'
import type { ApplyTagDto } from './dto/apply-tag.dto.js'

@Injectable()
export class TagsService {
  constructor(
    private readonly repo: TagsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async listTags(tenantId: string) {
    return { data: await this.repo.findAllTags(tenantId) }
  }

  async createTag(tenantId: string, dto: CreateTagDto) {
    try {
      const tag = await this.repo.createTag(tenantId, dto)
      return { data: tag }
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException(`Tag "${dto.name}" already exists`)
      throw err
    }
  }

  async deleteTag(tenantId: string, id: string) {
    const tag = await this.repo.findTagById(tenantId, id)
    if (!tag) throw new NotFoundException('Tag not found')
    await this.repo.deleteTag(tenantId, id)
    return { data: { deleted: true } }
  }

  async getPersonTags(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id: customerId },
      select: { id: true },
    })
    if (!customer) throw new NotFoundException('Customer not found')
    const personTags = await this.repo.getPersonTags(tenantId, customerId)
    return { data: personTags.map((pt) => ({ ...pt.tag, appliedAt: pt.appliedAt, appliedBy: pt.appliedBy })) }
  }

  async applyTag(tenantId: string, customerId: string, dto: ApplyTagDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id: customerId },
      select: { id: true },
    })
    if (!customer) throw new NotFoundException('Customer not found')

    const tag = await this.repo.findTagById(tenantId, dto.tagId)
    if (!tag) throw new NotFoundException('Tag not found')

    const personTag = await this.repo.applyTag(tenantId, customerId, dto.tagId, dto.appliedBy)
    return { data: { ...personTag.tag, appliedAt: personTag.appliedAt, appliedBy: personTag.appliedBy } }
  }

  async removeTag(tenantId: string, customerId: string, tagId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id: customerId },
      select: { id: true },
    })
    if (!customer) throw new NotFoundException('Customer not found')
    await this.repo.removeTag(customerId, tagId)
    return { data: { removed: true } }
  }
}
