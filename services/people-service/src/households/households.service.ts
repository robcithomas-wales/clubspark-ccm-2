import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateHouseholdDto, AddHouseholdMemberDto, AddRelationshipDto } from './dto/create-household.dto.js'

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.household.findMany({
      where: { tenantId },
      include: { members: { include: { customer: { select: { id: true, firstName: true, lastName: true } } } } },
      orderBy: { name: 'asc' },
    })
  }

  async listForCustomer(tenantId: string, customerId: string) {
    const memberships = await this.prisma.householdMember.findMany({
      where: { tenantId, customerId },
      include: {
        household: {
          include: { members: { include: { customer: { select: { id: true, firstName: true, lastName: true, lifecycleState: true } } } } },
        },
      },
    })
    return memberships.map((m) => m.household)
  }

  async create(tenantId: string, dto: CreateHouseholdDto) {
    const household = await this.prisma.household.create({
      data: { tenantId, name: dto.name },
    })
    if (dto.memberIds?.length) {
      await this.prisma.householdMember.createMany({
        data: dto.memberIds.map((id, i) => ({
          tenantId,
          householdId: household.id,
          customerId: id,
          role: i === 0 ? 'primary' : 'member',
        })),
        skipDuplicates: true,
      })
    }
    return this.prisma.household.findUnique({
      where: { id: household.id },
      include: { members: { include: { customer: { select: { id: true, firstName: true, lastName: true } } } } },
    })
  }

  async addMember(tenantId: string, householdId: string, dto: AddHouseholdMemberDto) {
    const household = await this.prisma.household.findFirst({ where: { id: householdId, tenantId } })
    if (!household) throw new NotFoundException('Household not found')
    try {
      return await this.prisma.householdMember.create({
        data: { tenantId, householdId, customerId: dto.customerId, role: dto.role ?? 'member' },
        include: { customer: { select: { id: true, firstName: true, lastName: true } } },
      })
    } catch {
      throw new ConflictException('Person is already a member of this household')
    }
  }

  async removeMember(tenantId: string, householdId: string, customerId: string) {
    const member = await this.prisma.householdMember.findFirst({ where: { householdId, customerId, tenantId } })
    if (!member) throw new NotFoundException('Household member not found')
    await this.prisma.householdMember.delete({ where: { id: member.id } })
  }

  async addRelationship(tenantId: string, customerId: string, dto: AddRelationshipDto) {
    const [from, to] = await Promise.all([
      this.prisma.customer.findFirst({ where: { tenantId, id: customerId } }),
      this.prisma.customer.findFirst({ where: { tenantId, id: dto.toCustomerId } }),
    ])
    if (!from || !to) throw new NotFoundException('One or both people not found')
    try {
      return await this.prisma.personRelationship.create({
        data: { tenantId, fromCustomerId: customerId, toCustomerId: dto.toCustomerId, relationship: dto.relationship },
      })
    } catch {
      throw new ConflictException('This relationship already exists')
    }
  }

  async getRelationships(tenantId: string, customerId: string) {
    return this.prisma.personRelationship.findMany({
      where: { tenantId, fromCustomerId: customerId },
      include: { toCustomer: { select: { id: true, firstName: true, lastName: true, lifecycleState: true } } },
    })
  }

  async removeRelationship(tenantId: string, customerId: string, relationshipId: string) {
    const rel = await this.prisma.personRelationship.findFirst({ where: { id: relationshipId, tenantId, fromCustomerId: customerId } })
    if (!rel) throw new NotFoundException('Relationship not found')
    await this.prisma.personRelationship.delete({ where: { id: relationshipId } })
  }
}
