import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class CoachingProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(tenantId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const [watermark] = await tx.$queryRaw<
          { generatedAt: Date }[]
        >`SELECT transaction_timestamp() AS "generatedAt"`
        const occupancies = await tx.lessonSession.findMany({
          where: { tenantId, bookableUnitId: { not: null } },
          select: {
            id: true,
            bookableUnitId: true,
            startsAt: true,
            endsAt: true,
            status: true,
            updatedAt: true,
          },
        })
        return {
          data: { generatedAt: (watermark?.generatedAt ?? new Date()).toISOString(), occupancies },
        }
      },
      { isolationLevel: 'RepeatableRead' },
    )
  }
}
