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

  async getSettings(venueId: string) {
    return this.prisma.read.venueSetting.findUnique({ where: { venueId } })
  }

  async upsertSettings(venueId: string, data: {
    openBookings?: boolean
    addOnsEnabled?: boolean
    pendingApprovals?: boolean
    splitPayments?: boolean
    publicBookingView?: string
  }) {
    return this.prisma.write.venueSetting.upsert({
      where: { venueId },
      create: { venueId, ...data },
      update: { ...data, updatedAt: new Date() },
    })
  }

  async findByClubCode(clubCode: string) {
    return this.prisma.read.organisation.findUnique({
      where: { clubCode },
      select: {
        tenantId: true,
        name: true,
        appName: true,
        primaryColour: true,
        secondaryColour: true,
        logoUrl: true,
        clubCode: true,
      },
    })
  }
}
