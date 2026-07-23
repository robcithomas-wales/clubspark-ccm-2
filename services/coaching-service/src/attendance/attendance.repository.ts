import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForSession(tenantId: string, programmeSessionId: string) {
    return this.prisma.attendance.findMany({
      where: { tenantId, programmeSessionId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findBySessionAndEnrolment(programmeSessionId: string, enrolmentId: string) {
    return this.prisma.attendance.findUnique({
      where: { programmeSessionId_enrolmentId: { programmeSessionId, enrolmentId } },
    })
  }

  async upsert(tenantId: string, programmeSessionId: string, enrolmentId: string, customerId: string, attended: boolean | undefined, notes?: string) {
    return this.prisma.attendance.upsert({
      where: { programmeSessionId_enrolmentId: { programmeSessionId, enrolmentId } },
      create: { tenantId, programmeSessionId, enrolmentId, customerId, attended: attended ?? null, notes: notes ?? null },
      update: { attended: attended ?? null, notes: notes ?? null },
    })
  }
}
