import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { UpsertOrganisationDto } from './dto/upsert-organisation.dto.js'
import type { PatchHomePageDto } from './dto/patch-home-page.dto.js'
import type { PatchDesignDto } from './dto/patch-design.dto.js'

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

  patchDesign(tenantId: string, dto: PatchDesignDto) {
    return this.prisma.write.organisation.update({
      where: { tenantId },
      data: {
        ...(dto.primaryColour   !== undefined ? { primaryColour:   dto.primaryColour   } : {}),
        ...(dto.secondaryColour !== undefined ? { secondaryColour: dto.secondaryColour } : {}),
        ...(dto.logoUrl         !== undefined ? { logoUrl:         dto.logoUrl         } : {}),
        ...(dto.faviconUrl      !== undefined ? { faviconUrl:      dto.faviconUrl      } : {}),
        ...(dto.headingFont     !== undefined ? { headingFont:     dto.headingFont     } : {}),
        ...(dto.bodyFont        !== undefined ? { bodyFont:        dto.bodyFont        } : {}),
        ...(dto.navLayout       !== undefined ? { navLayout:       dto.navLayout       } : {}),
      },
    })
  }

  patchHomePage(tenantId: string, dto: PatchHomePageDto) {
    return this.prisma.write.organisation.update({
      where: { tenantId },
      data: { homePageContent: dto as object },
    })
  }

  upsert(tenantId: string, dto: UpsertOrganisationDto) {
    const shared = {
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
      appName: dto.appName ?? null,
      clubCode: dto.clubCode ?? null,
      secondaryColour: dto.secondaryColour ?? null,
      headingFont: dto.headingFont ?? null,
      bodyFont: dto.bodyFont ?? null,
      navLayout: dto.navLayout ?? 'dark-inline',
      faviconUrl: dto.faviconUrl ?? null,
    }
    return this.prisma.write.organisation.upsert({
      where: { tenantId },
      create: {
        tenantId,
        isPublished: dto.isPublished ?? false,
        tenantType: dto.tenantType ?? 'club',
        ...shared,
      },
      update: {
        ...shared,
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
        ...(dto.tenantType  !== undefined ? { tenantType:  dto.tenantType  } : {}),
      },
    })
  }
}
