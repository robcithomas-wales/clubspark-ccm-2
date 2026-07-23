import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { CreateOrganisationDto } from './dto/create-organisation.dto.js'
import type { UpdateOrganisationDto } from './dto/update-organisation.dto.js'
import type { Prisma } from '../../generated/prisma/index.js'

@Injectable()
export class OrganisationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(opts: {
    search?: string
    status?: string
    plan?: string
    region?: string
    limit?: number
    offset?: number
  }) {
    const where: Prisma.OrganisationWhereInput = {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.plan ? { plan: opts.plan } : {}),
      ...(opts.region ? { region: opts.region } : {}),
      ...(opts.search
        ? {
            OR: [
              { name: { contains: opts.search, mode: 'insensitive' } },
              { adminEmail: { contains: opts.search, mode: 'insensitive' } },
              { slug: { contains: opts.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.organisation.findMany({
        where,
        include: {
          featureFlags: true,
          _count: { select: { impersonationSessions: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: opts.limit ?? 50,
        skip: opts.offset ?? 0,
      }),
      this.prisma.organisation.count({ where }),
    ])

    return { data, total }
  }

  async findByTenantId(tenantId: string) {
    const org = await this.prisma.organisation.findUnique({
      where: { tenantId },
      include: {
        featureFlags: true,
        impersonationSessions: { orderBy: { startedAt: 'desc' }, take: 10 },
        _count: { select: { impersonationSessions: true } },
      },
    })
    if (!org) throw new NotFoundException(`Organisation for tenant ${tenantId} not found`)
    return org
  }

  async create(dto: CreateOrganisationDto) {
    const existing = await this.prisma.organisation.findUnique({ where: { tenantId: dto.tenantId } })
    if (existing) throw new ConflictException(`Organisation for tenant ${dto.tenantId} already exists`)
    return this.prisma.organisation.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        slug: dto.slug,
        sport: dto.sport,
        region: dto.region,
        plan: dto.plan ?? 'trial',
        adminEmail: dto.adminEmail,
      },
      include: { featureFlags: true },
    })
  }

  // Upsert used by venue-service sync — only updates non-staff-managed fields
  async upsert(dto: CreateOrganisationDto) {
    return this.prisma.organisation.upsert({
      where: { tenantId: dto.tenantId },
      create: {
        tenantId: dto.tenantId,
        name: dto.name,
        slug: dto.slug,
        sport: dto.sport,
        region: dto.region,
        plan: dto.plan ?? 'trial',
        adminEmail: dto.adminEmail,
      },
      update: {
        name: dto.name,
        ...(dto.slug ? { slug: dto.slug } : {}),
        ...(dto.adminEmail ? { adminEmail: dto.adminEmail } : {}),
      },
      include: { featureFlags: true },
    })
  }

  async update(tenantId: string, dto: UpdateOrganisationDto) {
    await this.findByTenantId(tenantId)
    return this.prisma.organisation.update({
      where: { tenantId },
      data: dto,
      include: { featureFlags: true },
    })
  }

  async getAdminUserCount(tenantId: string) {
    return this.prisma.adminUser.count({ where: { tenantId, isActive: true } })
  }
}
