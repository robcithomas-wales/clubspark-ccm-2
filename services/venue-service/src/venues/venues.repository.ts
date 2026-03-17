import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class VenuesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.read.venue.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        timezone: true,
        city: true,
        country: true,
      },
    })
  }

  findById(tenantId: string, id: string) {
    return this.prisma.read.venue.findFirst({
      where: { tenantId, id },
    })
  }
}
