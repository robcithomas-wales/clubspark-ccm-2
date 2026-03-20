import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { AssignRoleDto } from './dto/assign-role.dto.js'

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { tenantId, id: customerId } })
    if (!customer) throw new NotFoundException('Customer not found')
    return this.prisma.personRole.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async assign(tenantId: string, customerId: string, dto: AssignRoleDto, assignedBy?: string) {
    const customer = await this.prisma.customer.findFirst({ where: { tenantId, id: customerId } })
    if (!customer) throw new NotFoundException('Customer not found')
    return this.prisma.personRole.create({
      data: {
        tenantId,
        customerId,
        role: dto.role,
        contextType: dto.contextType ?? null,
        contextId: dto.contextId ?? null,
        contextLabel: dto.contextLabel ?? null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        notes: dto.notes ?? null,
        assignedBy: assignedBy ?? null,
      },
    })
  }

  async updateStatus(tenantId: string, customerId: string, roleId: string, status: 'active' | 'inactive' | 'expired') {
    const role = await this.prisma.personRole.findFirst({ where: { id: roleId, tenantId, customerId } })
    if (!role) throw new NotFoundException('Role not found')
    return this.prisma.personRole.update({ where: { id: roleId }, data: { status } })
  }

  async remove(tenantId: string, customerId: string, roleId: string) {
    const role = await this.prisma.personRole.findFirst({ where: { id: roleId, tenantId, customerId } })
    if (!role) throw new NotFoundException('Role not found')
    await this.prisma.personRole.delete({ where: { id: roleId } })
  }
}
