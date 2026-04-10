import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { MessagesService } from './messages.service.js'
import { SendMessageDto } from './dto/send-message.dto.js'

@ApiTags('messages')
@Controller('competitions/:competitionId/messages')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get()
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') competitionId: string,
  ) {
    return this.service.list(req.tenantContext.tenantId, competitionId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message to competition entrants' })
  send(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string; adminId?: string } },
    @Param('competitionId') competitionId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.send(req.tenantContext.tenantId, competitionId, req.tenantContext.adminId, dto)
  }
}
