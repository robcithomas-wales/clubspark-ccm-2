import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery, ApiExcludeEndpoint } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Request } from '@nestjs/common'
import { CustomersService } from './customers.service.js'
import { CreateCustomerDto } from './dto/create-customer.dto.js'
import { UpdateCustomerDto } from './dto/update-customer.dto.js'
import { BatchPeopleDto } from './dto/batch-people.dto.js'
import { SkipTenant } from '@clubspark/auth'
import { InternalSecretGuard } from '@clubspark/auth'

@ApiTags('people')
@Controller('people')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'lifecycle', required: false, type: String })
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Query('page') page = 1,
    @Query('limit') limit = 25,
    @Query('search') search?: string,
    @Query('lifecycle') lifecycle?: string,
  ) {
    const safeLimit = Math.min(Number(limit), 100)
    return this.service.list(req.tenantContext.tenantId, Number(page), safeLimit, search, lifecycle)
  }

  /**
   * Service-to-service only: display fields for many people at once.
   *
   * Exists so other services can stop JOINing `people.persons` in their own SQL —
   * impossible once schemas live in separate regional databases. Booking uses this
   * to hydrate customer names on booking lists, which is why it is a batch: a
   * per-row lookup would be an N+1 across a paginated page.
   *
   * `@SkipTenant()` because a service-to-service caller has no end-user JWT;
   * InternalSecretGuard is the sole authenticator and the tenant comes from the
   * explicit header. Every query is still tenant-scoped.
   *
   * POST rather than GET: id lists routinely exceed a sane query-string length.
   */
  @Post('internal/batch')
  @SkipTenant()
  @UseGuards(InternalSecretGuard)
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  batchByIds(@Headers('x-tenant-id') tenantId: string | undefined, @Body() dto: BatchPeopleDto) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required')
    return this.service.findManyByIds(tenantId, dto.ids)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.findById(req.tenantContext.tenantId, id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a customer' })
  create(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Body() dto: CreateCustomerDto,
  ) {
    return this.service.create(req.tenantContext.tenantId, dto)
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk import customers from parsed CSV rows' })
  bulkImport(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Body() body: { rows: CreateCustomerDto[] },
  ) {
    return this.service.bulkImport(req.tenantContext.tenantId, body.rows)
  }

  @Get(':id/financial-profile')
  @ApiOperation({ summary: 'Get computed financial profile for a person' })
  financialProfile(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.getFinancialProfile(req.tenantContext.tenantId, id)
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a customer' })
  update(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.service.update(req.tenantContext.tenantId, id, dto)
  }
}
