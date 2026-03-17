import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { SKIP_TENANT_KEY } from '../decorators/skip-tenant.decorator'

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (skip) return true

    const request = context.switchToHttp().getRequest()
    const tenantId = request.headers['x-tenant-id']
    const organisationId = request.headers['x-organisation-id']

    if (!tenantId) {
      throw new UnauthorizedException('x-tenant-id header is required')
    }
    if (!organisationId) {
      throw new UnauthorizedException('x-organisation-id header is required')
    }

    request.tenantContext = { tenantId, organisationId }
    return true
  }
}
