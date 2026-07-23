import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class PlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        planFeatures: {
          include: { feature: true },
        },
      },
    })
  }

  async findById(id: string) {
    return this.prisma.plan.findUnique({
      where: { id },
      include: {
        planFeatures: {
          include: { feature: true },
        },
      },
    })
  }
}
