import { Controller, Get, Param } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PlansService } from './plans.service.js'

@ApiTags('plans')
@Controller({ path: 'plans', version: '1' })
export class PlansController {
  constructor(private readonly service: PlansService) {}

  /** List all plans with their feature sets. */
  @Get()
  findAll() {
    return this.service.findAll()
  }

  /** Get a single plan by id (core | growth | pro | enterprise). */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id)
  }
}
