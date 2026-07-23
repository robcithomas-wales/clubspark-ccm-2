import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class EnrolmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForProgramme(tenantId: string, programmeId: string) {
    return this.prisma.enrolment.findMany({
      where: { tenantId, programmeId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.enrolment.findFirst({ where: { id, tenantId } })
  }

  async findByProgrammeAndCustomer(programmeId: string, customerId: string) {
    return this.prisma.enrolment.findUnique({ where: { programmeId_customerId: { programmeId, customerId } } })
  }

  async countConfirmed(programmeId: string) {
    return this.prisma.enrolment.count({ where: { programmeId, status: 'confirmed' } })
  }

  async create(tenantId: string, programmeId: string, customerId: string, status: string, notes?: string) {
    return this.prisma.enrolment.create({ data: { tenantId, programmeId, customerId, status, notes: notes ?? null } })
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.enrolment.update({ where: { id }, data: { status } })
  }

  async setOrderId(id: string, orderId: string) {
    return this.prisma.enrolment.update({ where: { id }, data: { orderId } })
  }
}
