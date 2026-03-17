import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

interface ListInput {
  tenantId: string
  organisationId: string
  planId?: string | null
  status?: string | null
  customerId?: string | null
  ownerType?: string | null
  ownerId?: string | null
  search?: string | null
  limit: number
  offset: number
}

interface WriteInput {
  tenantId: string
  organisationId: string
  planId: string
  customerId?: string | null
  ownerType?: string | null
  ownerId?: string | null
  status: string
  startDate: string
  endDate?: string | null
  renewalDate?: string | null
  autoRenew: boolean
  paymentStatus?: string | null
  reference?: string | null
  source?: string | null
  notes?: string | null
}

@Injectable()
export class MembershipsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListInput) {
    const where: any = {
      tenantId: input.tenantId,
      organisationId: input.organisationId,
    }
    if (input.planId) where.planId = input.planId
    if (input.status) where.status = input.status
    if (input.customerId) where.customerId = input.customerId
    if (input.ownerType) where.ownerType = input.ownerType
    if (input.ownerId) where.ownerId = input.ownerId
    if (input.search) {
      where.OR = [
        { plan: { name: { contains: input.search, mode: 'insensitive' } } },
        { reference: { contains: input.search, mode: 'insensitive' } },
        { source: { contains: input.search, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await Promise.all([
      this.prisma.membership.findMany({
        where,
        include: { plan: { select: { name: true, ownershipType: true } } },
        orderBy: { createdAt: 'desc' },
        skip: input.offset,
        take: input.limit,
      }),
      this.prisma.membership.count({ where }),
    ])

    return { rows: rows.map((m) => this.format(m)), total }
  }

  async findById(tenantId: string, organisationId: string, id: string) {
    const m = await this.prisma.membership.findFirst({
      where: { id, tenantId, organisationId },
      include: { plan: { select: { name: true, ownershipType: true } } },
    })
    return m ? this.format(m) : null
  }

  async create(input: WriteInput) {
    const m = await this.prisma.membership.create({
      data: {
        tenantId: input.tenantId,
        organisationId: input.organisationId,
        planId: input.planId,
        customerId: input.customerId ?? null,
        ownerType: input.ownerType ?? null,
        ownerId: input.ownerId ?? null,
        status: input.status,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        renewalDate: input.renewalDate ? new Date(input.renewalDate) : null,
        autoRenew: input.autoRenew,
        paymentStatus: input.paymentStatus ?? null,
        reference: input.reference ?? null,
        source: input.source ?? null,
        notes: input.notes ?? null,
      },
      include: { plan: { select: { name: true, ownershipType: true } } },
    })
    return this.format(m)
  }

  async update(id: string, input: Omit<WriteInput, 'tenantId' | 'organisationId'>) {
    const m = await this.prisma.membership.update({
      where: { id },
      data: {
        planId: input.planId,
        customerId: input.customerId ?? null,
        ownerType: input.ownerType ?? null,
        ownerId: input.ownerId ?? null,
        status: input.status,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        renewalDate: input.renewalDate ? new Date(input.renewalDate) : null,
        autoRenew: input.autoRenew,
        paymentStatus: input.paymentStatus ?? null,
        reference: input.reference ?? null,
        source: input.source ?? null,
        notes: input.notes ?? null,
      },
      include: { plan: { select: { name: true, ownershipType: true } } },
    })
    return this.format(m)
  }

  async delete(id: string) {
    await this.prisma.membership.delete({ where: { id } })
  }

  private format(m: any) {
    const { plan, ...rest } = m
    return {
      ...rest,
      planName: plan?.name ?? null,
      ownershipType: plan?.ownershipType ?? null,
      householdId: rest.ownerType === 'household' ? rest.ownerId : null,
    }
  }
}
