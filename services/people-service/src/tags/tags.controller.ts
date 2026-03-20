import {
  Controller, Get, Post, Delete,
  Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Request } from '@nestjs/common'
import { TagsService } from './tags.service.js'
import { CreateTagDto } from './dto/create-tag.dto.js'
import { ApplyTagDto } from './dto/apply-tag.dto.js'

// ─── Tenant tags (catalogue) ─────────────────────────────────────────────────

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly service: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tags for the tenant' })
  list(@Request() req: FastifyRequest & { tenantContext: { tenantId: string } }) {
    return this.service.listTags(req.tenantContext.tenantId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a tag' })
  create(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Body() dto: CreateTagDto,
  ) {
    return this.service.createTag(req.tenantContext.tenantId, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a tag' })
  remove(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.deleteTag(req.tenantContext.tenantId, id)
  }
}

// ─── Person tags ─────────────────────────────────────────────────────────────

@ApiTags('tags')
@Controller('people/:customerId/tags')
export class PersonTagsController {
  constructor(private readonly service: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get tags applied to a customer' })
  getPersonTags(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('customerId') customerId: string,
  ) {
    return this.service.getPersonTags(req.tenantContext.tenantId, customerId)
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a tag to a customer' })
  applyTag(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('customerId') customerId: string,
    @Body() dto: ApplyTagDto,
  ) {
    return this.service.applyTag(req.tenantContext.tenantId, customerId, dto)
  }

  @Delete(':tagId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a tag from a customer' })
  removeTag(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('customerId') customerId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.service.removeTag(req.tenantContext.tenantId, customerId, tagId)
  }
}
