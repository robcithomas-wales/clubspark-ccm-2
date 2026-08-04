import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { PrismaService } from '../prisma/prisma.service.js'
import { SkipTenant } from '@clubspark/auth'

/**
 * Health check endpoints — used by Azure Container Apps readiness/liveness probes.
 * No authentication required on these routes: @SkipTenant() exempts the whole
 * controller from TenantContextGuard, which otherwise fail-closes with a 401.
 */
@ApiTags('health')
@Controller('health')
@SkipTenant()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Service liveness check' })
  check() {
    return { status: 'ok', service: 'template-service', timestamp: new Date().toISOString() }
  }

  @Get('db')
  @ApiOperation({ summary: 'Database connectivity check' })
  async checkDb() {
    await this.prisma.write.$queryRaw`SELECT 1`
    return {
      status: 'ok',
      service: 'template-service',
      db: 'connected',
      timestamp: new Date().toISOString(),
    }
  }
}
