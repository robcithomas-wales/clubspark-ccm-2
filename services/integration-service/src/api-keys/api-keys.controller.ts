import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger'
import { ApiKeysService } from './api-keys.service.js'
import { CreateApiKeyDto } from './dto/create-api-key.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('api-keys')
@ApiSecurity('tenant-id')
@Controller({ path: 'api-keys', version: '1' })
export class ApiKeysController {
  constructor(private readonly service: ApiKeysService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue a new API key — plaintext returned once only' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateApiKeyDto) {
    return this.service.create(ctx.tenantId, dto)
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys for the tenant' })
  list(@TenantCtx() ctx: TenantContext) {
    return this.service.list(ctx.tenantId)
  }

  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend an API key (revocable, retains history)' })
  suspend(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.suspend(ctx.tenantId, id)
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-activate a suspended API key' })
  activate(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.activate(ctx.tenantId, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently revoke an API key (soft delete)' })
  revoke(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.revoke(ctx.tenantId, id)
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'View usage log for an API key' })
  usage(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.service.usage(ctx.tenantId, id, page, limit)
  }
}
