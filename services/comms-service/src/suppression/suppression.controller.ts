import { Controller, Post, Delete, Get, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { IsString, IsIn, IsOptional } from 'class-validator'
import { Tenant, TenantContext } from '../common/decorators/tenant-context.decorator.js'
import { PrismaService } from '../prisma/prisma.service.js'

class AddSuppressionDto {
  @IsOptional() @IsString() email?: string
  @IsOptional() @IsString() phone?: string
  @IsIn(['email', 'sms', 'all']) channel!: string
  @IsIn(['unsubscribed', 'bounced', 'spam_complaint', 'admin']) reason!: string
}

/**
 * Suppression Controller
 * ─────────────────────
 * Manages the tenant opt-out / bounce list.
 * In production, bounces and spam complaints are auto-added via provider webhooks
 * (POST /v1/webhooks/email-status or sms-status) — see delivery service stubs.
 */
@ApiTags('Suppression')
@Controller({ path: 'suppression', version: '1' })
export class SuppressionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List suppressed contacts for the tenant' })
  list(@Tenant() ctx: TenantContext) {
    return this.prisma.read.suppression.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  @Post()
  @ApiOperation({ summary: 'Add a contact to the suppression list' })
  add(@Tenant() ctx: TenantContext, @Body() dto: AddSuppressionDto) {
    return this.prisma.write.suppression.create({
      data: { tenantId: ctx.tenantId, ...dto },
    })
  }

  @Delete()
  @ApiOperation({ summary: 'Remove a contact from the suppression list' })
  async remove(
    @Tenant() ctx: TenantContext,
    @Query('email') email?: string,
    @Query('phone') phone?: string,
    @Query('channel') channel = 'all',
  ) {
    await this.prisma.write.suppression.deleteMany({
      where: {
        tenantId: ctx.tenantId,
        channel,
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
      },
    })
    return { removed: true }
  }
}
