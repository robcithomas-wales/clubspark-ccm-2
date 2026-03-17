import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

interface ListInput {
  tenantId: string
  organisationId: string
  status?: string | null
  search?: string | null
  limit: number
  offset: number
}

interface CreateInput {
  tenantId: string
  organisationId: string
  name: string
  description?: string | null
  status?: string
}

interface UpdateInput {
  tenantId: string
  organisationId: string
  id: string
  name?: string
  description?: string | null
  status?: string
}

@Injectable()
export class MembershipSchemesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListInput) {
    const where: any = {
      tenantId: input.tenantId,
      organisationId: input.organisationId,
    }
    if (input.status) where.status = input.status
    if (input.search) where.name = { contains: input.search, mode: 'insensitive' }

    const [rows, total] = await Promise.all([
      this.prisma.membershipScheme.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: input.offset,
        take: input.limit,
      }),
      this.prisma.membershipScheme.count({ where }),
    ])

    return { rows, total }
  }

  async findById(tenantId: string, organisationId: string, id: string) {
    return this.prisma.membershipScheme.findFirst({
      where: { id, tenantId, organisationId },
    })
  }

  async create(input: CreateInput) {
    return this.prisma.membershipScheme.create({
      data: {
        tenantId: input.tenantId,
        organisationId: input.organisationId,
        name: input.name,
        description: input.description ?? null,
        status: input.status ?? 'active',
      },
    })
  }

  async update(input: UpdateInput) {
    const existing = await this.findById(input.tenantId, input.organisationId, input.id)
    if (!existing) return null

    return this.prisma.membershipScheme.update({
      where: { id: input.id },
      data: {
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        status: input.status ?? existing.status,
      },
    })
  }
}
