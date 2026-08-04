import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { SkipTenant } from '@clubspark/auth'

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @SkipTenant()
  check() {
    return { status: 'ok', service: 'comms-service', timestamp: new Date().toISOString() }
  }
}
