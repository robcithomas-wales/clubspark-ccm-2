import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { UpsertNewsPostDto } from './dto/upsert-news-post.dto.js'

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

@Injectable()
export class NewsPostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.read.newsPost.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  findPublished(tenantId: string) {
    return this.prisma.read.newsPost.findMany({
      where: { tenantId, published: true },
      orderBy: { publishedAt: 'desc' },
    })
  }

  findBySlug(tenantId: string, slug: string) {
    return this.prisma.read.newsPost.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    })
  }

  findById(id: string, tenantId: string) {
    return this.prisma.read.newsPost.findFirst({ where: { id, tenantId } })
  }

  async create(tenantId: string, dto: UpsertNewsPostDto) {
    const baseSlug = slugify(dto.title)
    // Ensure slug is unique within tenant
    let slug = baseSlug
    let suffix = 1
    while (await this.prisma.read.newsPost.findUnique({ where: { tenantId_slug: { tenantId, slug } } })) {
      slug = `${baseSlug}-${suffix++}`
    }
    return this.prisma.write.newsPost.create({
      data: {
        tenantId,
        title: dto.title,
        slug,
        body: dto.body ?? null,
        coverImageUrl: dto.coverImageUrl ?? null,
        published: dto.published ?? false,
        publishedAt: dto.published ? new Date() : null,
      },
    })
  }

  update(id: string, tenantId: string, dto: UpsertNewsPostDto) {
    return this.prisma.write.newsPost.updateMany({
      where: { id, tenantId },
      data: {
        title: dto.title,
        body: dto.body ?? null,
        coverImageUrl: dto.coverImageUrl ?? null,
        published: dto.published ?? false,
        publishedAt: dto.published ? new Date() : null,
        updatedAt: new Date(),
      },
    })
  }

  delete(id: string, tenantId: string) {
    return this.prisma.write.newsPost.deleteMany({ where: { id, tenantId } })
  }
}
