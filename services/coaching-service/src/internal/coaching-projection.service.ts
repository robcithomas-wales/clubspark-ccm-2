import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class CoachingProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(tenantId: string) {
    // The watermark must come from the SAME clock as the row timestamps it will
    // be compared against. Row `updatedAt` is Prisma's client-generated value and
    // live events stamp `sourceUpdatedAt` from this process, so a database
    // `transaction_timestamp()` watermark mixed two clocks: if this host's clock
    // trailed the database's, every mutation made after a backfill was judged
    // "stale" by the consumer, dropped, and never retried.
    const generatedAt = new Date()
    return this.prisma.$transaction(
      async (tx) => {
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
          data: { generatedAt: generatedAt.toISOString(), occupancies },
        }
      },
      { isolationLevel: 'RepeatableRead' },
    )
  }
}
