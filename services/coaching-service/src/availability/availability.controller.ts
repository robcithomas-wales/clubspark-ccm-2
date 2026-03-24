import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { AvailabilityService } from './availability.service.js'
import { SetAvailabilityDto } from './dto/set-availability.dto.js'
import { CreateBlockDto } from './dto/create-block.dto.js'

@ApiTags('availability')
@Controller('coaches/:coachId/availability')
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Get('windows')
  @ApiOperation({ summary: 'Get recurring availability windows for a coach' })
  getWindows(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('coachId') coachId: string,
  ) {
    return this.service.getWindows(req.tenantContext.tenantId, coachId)
  }

  @Put('windows')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace all availability windows for a coach' })
  setWindows(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('coachId') coachId: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.service.setWindows(req.tenantContext.tenantId, coachId, dto)
  }

  @Get('slots')
  @ApiOperation({ summary: 'Get available booking slots for a coach on a given date' })
  @ApiQuery({ name: 'date', required: true, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'durationMinutes', required: true, type: Number })
  getSlots(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('coachId') coachId: string,
    @Query('date') date: string,
    @Query('durationMinutes') durationMinutes: number,
  ) {
    return this.service.getSlots(
      req.tenantContext.tenantId,
      coachId,
      date,
      Number(durationMinutes),
    )
  }

  @Get('blocks')
  @ApiOperation({ summary: 'Get coach blocks (unavailability periods) in a date range' })
  @ApiQuery({ name: 'from', required: true, type: String, description: 'ISO datetime' })
  @ApiQuery({ name: 'to', required: true, type: String, description: 'ISO datetime' })
  getBlocks(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('coachId') coachId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.getBlocks(req.tenantContext.tenantId, coachId, from, to)
  }

  @Post('blocks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a coach block (holiday, illness, etc.)' })
  createBlock(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('coachId') coachId: string,
    @Body() dto: CreateBlockDto,
  ) {
    return this.service.createBlock(req.tenantContext.tenantId, coachId, dto)
  }

  @Delete('blocks/:blockId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a coach block' })
  deleteBlock(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('coachId') coachId: string,
    @Param('blockId') blockId: string,
  ) {
    return this.service.deleteBlock(req.tenantContext.tenantId, coachId, blockId)
  }
}
