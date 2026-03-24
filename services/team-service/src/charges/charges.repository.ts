import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { ChargeRunStatus } from '../generated/prisma/index.js'

@Injectable()
export class ChargesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getRunsForFixture(fixtureId: string) {
    return this.prisma.chargeRun.findMany({
      where: { fixtureId },
      include: {
        charges: {
          include: { teamMember: true },
          orderBy: { teamMember: { displayName: 'asc' } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getRunById(runId: string) {
    return this.prisma.chargeRun.findUnique({
      where: { id: runId },
      include: {
        charges: {
          include: { teamMember: true },
          orderBy: { teamMember: { displayName: 'asc' } },
        },
      },
    })
  }

  async createRun(
    tenantId: string,
    fixtureId: string,
    initiatedBy: string,
    notes: string | undefined,
    charges: Array<{ teamMemberId: string; amount: number }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.chargeRun.create({
        data: {
          tenantId,
          fixtureId,
          initiatedBy,
          notes,
          status: ChargeRunStatus.draft,
          charges: {
            create: charges.map((c) => ({
              teamMemberId: c.teamMemberId,
              amount: c.amount,
              status: 'pending' as any,
            })),
          },
        },
        include: {
          charges: {
            include: { teamMember: true },
            orderBy: { teamMember: { displayName: 'asc' } },
          },
        },
      })
      return run
    })
  }

  async markRunCompleted(runId: string) {
    return this.prisma.chargeRun.update({
      where: { id: runId },
      data: { status: ChargeRunStatus.completed },
    })
  }

  async markRunFailed(runId: string) {
    return this.prisma.chargeRun.update({
      where: { id: runId },
      data: { status: ChargeRunStatus.cancelled },
    })
  }

  async markChargePaid(chargeId: string, stripePaymentIntentId?: string) {
    return this.prisma.charge.update({
      where: { id: chargeId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        stripePaymentIntentId: stripePaymentIntentId ?? null,
      },
    })
  }

  async markChargeWaived(chargeId: string, notes?: string) {
    return this.prisma.charge.update({
      where: { id: chargeId },
      data: {
        status: 'waived',
        notes,
      },
    })
  }
}
