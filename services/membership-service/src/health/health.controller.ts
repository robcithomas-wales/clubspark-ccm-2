import { Controller, Get } from '@nestjs/common'
import { SkipTenant } from '@clubspark/auth'

@Controller('health')
export class HealthController {
  @Get()
  @SkipTenant()
  check() {
    return { status: 'ok', service: 'membership-service' }
  }
}
