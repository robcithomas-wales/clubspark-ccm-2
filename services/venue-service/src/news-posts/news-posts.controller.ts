import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiSecurity } from '@nestjs/swagger'
import { SetMetadata } from '@nestjs/common'
import { NewsPostsService } from './news-posts.service.js'
import { UpsertNewsPostDto } from './dto/upsert-news-post.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'
import { SKIP_TENANT_KEY } from '../common/guards/tenant-context.guard.js'

const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true)

@ApiTags('news-posts')
@ApiSecurity('tenant-id')
@Controller('news-posts')
export class NewsPostsController {
  constructor(private readonly service: NewsPostsService) {}

  @Get()
  list(@TenantCtx() ctx: TenantContext) {
    return this.service.list(ctx.tenantId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@TenantCtx() ctx: TenantContext, @Body() dto: UpsertNewsPostDto) {
    return this.service.create(ctx.tenantId, dto)
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpsertNewsPostDto) {
    return this.service.update(id, ctx.tenantId, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.delete(id, ctx.tenantId)
  }

  // ─── Public endpoints (customer portal) ────────────────────────────────────

  @Get('public/list')
  @SkipTenant()
  listPublic(@Query('tenantId') tenantId: string) {
    return this.service.listPublished(tenantId)
  }

  @Get('public/by-slug')
  @SkipTenant()
  getBySlug(@Query('tenantId') tenantId: string, @Query('slug') slug: string) {
    return this.service.getBySlug(tenantId, slug)
  }
}
