import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { UpsertOrganisationDto } from './dto/upsert-organisation.dto.js'

@Injectable()
export class OrganisationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenantId(tenantId: string) {
    return this.prisma.read.organisation.findUnique({ where: { tenantId } })
  }

  findBySlug(slug: string) {
    return this.prisma.read.organisation.findUnique({ where: { slug } })
  }

  findByCustomDomain(domain: string) {
    return this.prisma.read.organisation.findUnique({ where: { customDomain: domain } })
  }

  upsert(tenantId: string, dto: UpsertOrganisationDto) {
    return this.prisma.write.organisation.upsert({
      where: { tenantId },
      create: {
        tenantId,
        name: dto.name,
        slug: dto.slug,
        customDomain: dto.customDomain ?? null,
        primaryColour: dto.primaryColour ?? '#1857E0',
        logoUrl: dto.logoUrl ?? null,
        about: dto.about ?? null,
        address: dto.address ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        mapsEmbedUrl: dto.mapsEmbedUrl ?? null,
        isPublished: dto.isPublished ?? false,
      },
      update: {
        name: dto.name,
        slug: dto.slug,
        customDomain: dto.customDomain ?? null,
        primaryColour: dto.primaryColour ?? '#1857E0',
        logoUrl: dto.logoUrl ?? null,
        about: dto.about ?? null,
        address: dto.address ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        mapsEmbedUrl: dto.mapsEmbedUrl ?? null,
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
      },
    })
  }
}
