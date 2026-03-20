import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PrismaService } from '../prisma/prisma.service.js'
import { SkipTenant } from '../common/decorators/skip-tenant.decorator.js'

@ApiTags('health')
@Controller('health')
@SkipTenant()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  liveness() {
    return { status: 'ok', service: 'admin-service' }
  }

  @Get('db')
  async readiness() {
    await this.prisma.$queryRaw`SELECT 1`
    return { status: 'ok', database: 'connected' }
  }
}
