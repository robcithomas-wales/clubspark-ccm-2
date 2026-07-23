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
} from '@nestjs/common'
import { ApiTags, ApiSecurity, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { SessionsService } from './sessions.service.js'
import { CreateSessionDto } from './dto/create-session.dto.js'
import { JoinSessionDto } from './dto/join-session.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('sessions')
@ApiSecurity('tenant-id')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List open booking sessions' })
  @ApiQuery({ name: 'status', required: false, enum: ['open', 'full', 'cancelled', 'completed'] })
  @ApiQuery({ name: 'upcoming', required: false, type: Boolean })
  async list(
    @TenantCtx() ctx: TenantContext,
    @Query('status') status?: string,
    @Query('upcoming') upcoming?: string,
  ) {
    const sessions = await this.service.list(ctx, {
      status,
      upcoming: upcoming === 'true',
    })
    return { data: sessions, total: sessions.length }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID with participant list' })
  async getOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return { data: await this.service.getById(ctx, id) }
  }

  @Post()
  @ApiOperation({ summary: 'Create a session' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateSessionDto) {
    return { data: await this.service.create(ctx, dto) }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update session details' })
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: Partial<CreateSessionDto>,
  ) {
    return { data: await this.service.update(ctx, id, dto) }
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a session' })
  async cancel(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return { data: await this.service.cancel(ctx, id) }
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark session as completed' })
  async complete(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return { data: await this.service.complete(ctx, id) }
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'List participants for a session' })
  async participants(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    const list = await this.service.getParticipants(ctx, id)
    return { data: list, total: list.length }
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a participant for a session' })
  async join(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: JoinSessionDto,
  ) {
    return { data: await this.service.join(ctx, id, dto) }
  }

  @Patch(':id/participants/:participantId')
  @ApiOperation({ summary: 'Update participant status or payment' })
  async updateParticipant(
    @TenantCtx() ctx: TenantContext,
    @Param('id') sessionId: string,
    @Param('participantId') participantId: string,
    @Body() dto: { status?: string; paymentStatus?: string },
  ) {
    return { data: await this.service.updateParticipant(ctx, sessionId, participantId, dto) }
  }
}
