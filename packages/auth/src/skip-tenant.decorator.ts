import { SetMetadata } from '@nestjs/common'
import { SKIP_TENANT_KEY } from './constants.js'

/**
 * Exempt a handler or controller from tenant authentication.
 *
 * Honoured by `TenantContextGuard` via the Nest `Reflector`. Two services used
 * to declare this decorator and never read it — their guards had no `Reflector`
 * at all, so `@SkipTenant()` was inert and only a hard-coded `/health` path
 * prefix kept their health checks reachable. Anyone applying it to a new route
 * there would have got a silent 401. There is now one implementation, and it
 * works everywhere.
 */
export const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true)
