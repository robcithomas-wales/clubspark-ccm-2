import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateMemberDto } from './dto/create-member.dto.js'
import type { UpdateMemberDto } from './dto/update-member.dto.js'

@Injectable()
export class RosterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, teamId: string, activeOnly?: boolean) {
    return this.prisma.teamMember.findMany({
      where: { tenantId, teamId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: [{ shirtNumber: 'asc' }, { displayName: 'asc' }],
    })
  }

  async findById(tenantId: string, teamId: string, id: string) {
    return this.prisma.teamMember.findFirst({ where: { tenantId, teamId, id } })
  }

  async create(tenantId: string, teamId: string, dto: CreateMemberDto) {
    return this.prisma.teamMember.create({
      data: {
        tenantId,
        teamId,
        personId: dto.personId ?? null,
        displayName: dto.displayName,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        position: dto.position ?? null,
        shirtNumber: dto.shirtNumber ?? null,
        isGuest: dto.isGuest ?? false,
        isJunior: dto.isJunior ?? false,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        guardianName: dto.guardianName ?? null,
        guardianEmail: dto.guardianEmail ?? null,
        guardianPhone: dto.guardianPhone ?? null,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async update(tenantId: string, teamId: string, id: string, dto: UpdateMemberDto) {
    const data: Record<string, unknown> = {}
    if (dto.displayName !== undefined) data.displayName = dto.displayName
    if (dto.email !== undefined) data.email = dto.email ?? null
    if (dto.phone !== undefined) data.phone = dto.phone ?? null
    if (dto.position !== undefined) data.position = dto.position ?? null
    if (dto.shirtNumber !== undefined) data.shirtNumber = dto.shirtNumber ?? null
    if (dto.isGuest !== undefined) data.isGuest = dto.isGuest
    if (dto.isJunior !== undefined) data.isJunior = dto.isJunior
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null
    if (dto.guardianName !== undefined) data.guardianName = dto.guardianName ?? null
    if (dto.guardianEmail !== undefined) data.guardianEmail = dto.guardianEmail ?? null
    if (dto.guardianPhone !== undefined) data.guardianPhone = dto.guardianPhone ?? null
    if (dto.isActive !== undefined) data.isActive = dto.isActive

    await this.prisma.teamMember.updateMany({ where: { tenantId, teamId, id }, data })
    return this.findById(tenantId, teamId, id)
  }

  async remove(tenantId: string, teamId: string, id: string) {
    return this.prisma.teamMember.updateMany({
      where: { tenantId, teamId, id },
      data: { isActive: false },
    })
  }
}
