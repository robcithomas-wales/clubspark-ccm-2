import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiSecurity, ApiQuery } from '@nestjs/swagger'
import { PaymentsService } from './payments.service.js'
import { CreatePaymentDto } from './dto/create-payment.dto.js'
import { RefundPaymentDto } from './dto/refund-payment.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('payments')
@ApiSecurity('tenant-id')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreatePaymentDto) {
    return this.service.create(ctx.tenantId, dto)
  }

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'subjectType', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  findAll(
    @TenantCtx() ctx: TenantContext,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('subjectType') subjectType?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.service.findAll(ctx.tenantId, page, limit, subjectType, subjectId)
  }

  @Get(':id')
  findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.findOne(ctx.tenantId, id)
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  refund(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.service.refund(ctx.tenantId, id, dto)
  }
}
