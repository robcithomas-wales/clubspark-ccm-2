import { Controller, Get, Patch, Param, Body } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { IsOptional, IsString, IsBoolean } from 'class-validator'
import { Tenant, TenantContext } from '../common/decorators/tenant-context.decorator.js'
import { TemplatesService } from './templates.service.js'

class UpdateTemplateDto {
  @IsOptional() @IsString() customFooter?: string
  @IsOptional() @IsString() replyTo?: string
  @IsOptional() @IsBoolean() isActive?: boolean
}

@ApiTags('Templates')
@Controller({ path: 'templates', version: '1' })
export class TemplatesController {
  constructor(private readonly svc: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all templates (system + tenant overrides)' })
  list(@Tenant() ctx: TenantContext) {
    return this.svc.findAll(ctx.tenantId)
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Customise a template (footer, reply-to, enable/disable)' })
  update(
    @Tenant() ctx: TenantContext,
    @Param('key') key: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.svc.updateCustomisation(ctx.tenantId, key, dto)
  }
}
