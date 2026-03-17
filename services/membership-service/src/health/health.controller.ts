import { Controller, Get } from '@nestjs/common'
import { SkipTenant } from '../common/decorators/skip-tenant.decorator'

@Controller('health')
export class HealthController {
  @Get()
  @SkipTenant()
  check() {
    return { status: 'ok', service: 'membership-service' }
  }
}
