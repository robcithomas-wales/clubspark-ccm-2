import { SetMetadata } from '@nestjs/common'
import { SKIP_TENANT_KEY } from '../guards/tenant-context.guard.js'

export const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true)
