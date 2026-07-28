import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac } from 'crypto'
import type { FastifyRequest } from 'fastify'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { AppConfig } from '../../config/configuration.js'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & { tenantContext?: unknown; apiKey?: { id: string; tenantId: string; scopes: string[] } }
    >()

    const raw = request.headers['x-api-key'] as string | undefined
    if (!raw) throw new UnauthorizedException('Missing X-API-Key header')

    // Use the SAME secret source as ApiKeysService (which hashes keys on issue),
    // otherwise issued keys would never authenticate. Fail closed on empty secret
    // rather than HMAC-ing with an empty key.
    const secret = this.config.get('apiKeyHashSecret', { infer: true })
    if (!secret) throw new UnauthorizedException('API key hashing is not configured')

    const keyHash = createHmac('sha256', secret)
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
