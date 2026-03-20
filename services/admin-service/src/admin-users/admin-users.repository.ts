import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateAdminUserDto } from './dto/create-admin-user.dto.js'
import type { UpdateAdminUserDto } from './dto/update-admin-user.dto.js'

@Injectable()
export class AdminUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(tenantId: string, userId: string) {
    return this.prisma.adminUser.findFirst({
      where: { tenantId, userId, isActive: true },
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.adminUser.findFirst({
      where: { tenantId, id },
    })
  }

  async list(tenantId: string) {
    return this.prisma.adminUser.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async countForTenant(tenantId: string) {
    return this.prisma.adminUser.count({ where: { tenantId } })
  }

  async create(tenantId: string, dto: CreateAdminUserDto) {
    return this.prisma.adminUser.create({
      data: {
        userId: dto.userId,
        tenantId,
        role: dto.role,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateAdminUserDto) {
    return this.prisma.adminUser.updateMany({
      where: { tenantId, id },
      data: {
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    })
  }

  async delete(tenantId: string, id: string) {
    return this.prisma.adminUser.deleteMany({
      where: { tenantId, id },
    })
  }
}
