import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class ResourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.read.resource.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        tenantId: true,
        venueId: true,
        name: true,
        resourceType: true,
        sport: true,
        isActive: true,
      },
    })
  }
}
