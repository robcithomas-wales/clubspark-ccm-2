import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { createHmac } from 'crypto'
import type { FastifyRequest } from 'fastify'
import { PrismaService } from '../../prisma/prisma.service.js'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & { tenantContext?: unknown; apiKey?: { id: string; tenantId: string; scopes: string[] } }
    >()

    const raw = request.headers['x-api-key'] as string | undefined
    if (!raw) throw new UnauthorizedException('Missing X-API-Key header')

    const keyHash = createHmac('sha256', process.env['API_KEY_HASH_SECRET'] ?? '')
      .update(raw)
      .digest('hex')

    const apiKey = await this.prisma.read.apiKey.findFirst({
      where: { keyHash, isActive: true, deletedAt: null },
    })

    if (!apiKey) throw new UnauthorizedException('Invalid or revoked API key')

    request.apiKey = { id: apiKey.id, tenantId: apiKey.tenantId, scopes: apiKey.scopes }
    request.tenantContext = { tenantId: apiKey.tenantId, organisationId: '' }
    return true
  }
}
