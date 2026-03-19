import { Injectable, NotFoundException } from '@nestjs/common'
import { NewsPostsRepository } from './news-posts.repository.js'
import type { UpsertNewsPostDto } from './dto/upsert-news-post.dto.js'

@Injectable()
export class NewsPostsService {
  constructor(private readonly repo: NewsPostsRepository) {}

  async list(tenantId: string) {
    return { data: await this.repo.findAll(tenantId) }
  }

  async listPublished(tenantId: string) {
    return { data: await this.repo.findPublished(tenantId) }
  }

  async getBySlug(tenantId: string, slug: string) {
    const post = await this.repo.findBySlug(tenantId, slug)
    if (!post || !post.published) throw new NotFoundException('Post not found')
    return { data: post }
  }

  async create(tenantId: string, dto: UpsertNewsPostDto) {
    return { data: await this.repo.create(tenantId, dto) }
  }

  async update(id: string, tenantId: string, dto: UpsertNewsPostDto) {
    const existing = await this.repo.findById(id, tenantId)
    if (!existing) throw new NotFoundException('Post not found')
    await this.repo.update(id, tenantId, dto)
    return { data: await this.repo.findById(id, tenantId) }
  }

  async delete(id: string, tenantId: string) {
    const existing = await this.repo.findById(id, tenantId)
    if (!existing) throw new NotFoundException('Post not found')
    await this.repo.delete(id, tenantId)
    return { data: { deleted: true } }
  }
}
