import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { IsString, IsOptional, IsIn, ValidateNested, IsArray } from 'class-validator'
import { Type } from 'class-transformer'
import { Tenant, TenantContext } from '../common/decorators/tenant-context.decorator.js'
import { AudiencesService } from './audiences.service.js'

class AudienceRuleDto {
  @IsString() field!: string
  @IsString() operator!: string
  value!: string | number
}

class RulesJsonDto {
  @IsIn(['and', 'or']) logic!: 'and' | 'or'
  @IsArray() @ValidateNested({ each: true }) @Type(() => AudienceRuleDto) rules!: AudienceRuleDto[]
}

class CreateSavedAudienceDto {
  @IsString() name!: string
  @IsOptional() @IsString() description?: string
  @ValidateNested() @Type(() => RulesJsonDto) rulesJson!: RulesJsonDto
}

class UpdateSavedAudienceDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @ValidateNested() @Type(() => RulesJsonDto) rulesJson?: RulesJsonDto
}

@ApiTags('Audiences')
@Controller({ path: 'audiences', version: '1' })
export class AudiencesController {
  constructor(private readonly svc: AudiencesService) {}

  @Get()
  @ApiOperation({ summary: 'List all saved audiences for the tenant' })
  list(@Tenant() ctx: TenantContext) {
    return this.svc.findAll(ctx.tenantId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a saved audience by ID' })
  getById(@Tenant() ctx: TenantContext, @Param('id') id: string) {
    return this.svc.findById(ctx.tenantId, id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a saved audience' })
  create(@Tenant() ctx: TenantContext, @Body() dto: CreateSavedAudienceDto) {
    return this.svc.create(ctx.tenantId, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved audience' })
  update(
    @Tenant() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateSavedAudienceDto,
  ) {
    return this.svc.update(ctx.tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved audience' })
  async remove(@Tenant() ctx: TenantContext, @Param('id') id: string) {
    await this.svc.remove(ctx.tenantId, id)
  }
}
