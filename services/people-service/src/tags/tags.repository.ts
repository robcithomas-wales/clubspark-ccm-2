import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateTagDto } from './dto/create-tag.dto.js'

@Injectable()
export class TagsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllTags(tenantId: string) {
    return this.prisma.tag.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
  }

  findTagById(tenantId: string, id: string) {
    return this.prisma.tag.findFirst({ where: { tenantId, id } })
  }

  createTag(tenantId: string, dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: { tenantId, name: dto.name, colour: dto.colour ?? null },
    })
  }

  deleteTag(tenantId: string, id: string) {
    return this.prisma.tag.deleteMany({ where: { tenantId, id } })
  }

  getPersonTags(tenantId: string, customerId: string) {
    return this.prisma.personTag.findMany({
      where: { tenantId, customerId },
      include: { tag: true },
      orderBy: { appliedAt: 'desc' },
    })
  }

  applyTag(tenantId: string, customerId: string, tagId: string, appliedBy?: string) {
    return this.prisma.personTag.upsert({
      where: { customerId_tagId: { customerId, tagId } },
      create: { customerId, tagId, tenantId, appliedBy: appliedBy ?? null },
      update: { appliedBy: appliedBy ?? null, appliedAt: new Date() },
      include: { tag: true },
    })
  }

  removeTag(customerId: string, tagId: string) {
    return this.prisma.personTag.deleteMany({
      where: { customerId, tagId },
    })
  }
}
