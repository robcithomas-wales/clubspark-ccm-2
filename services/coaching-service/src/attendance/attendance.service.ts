import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { AttendanceRepository } from './attendance.repository.js'
import { ProgrammesRepository } from '../programmes/programmes.repository.js'
import { EnrolmentsRepository } from '../enrolments/enrolments.repository.js'
import type { MarkAttendanceDto } from './dto/mark-attendance.dto.js'

@Injectable()
export class AttendanceService {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly programmesRepo: ProgrammesRepository,
    private readonly enrolmentsRepo: EnrolmentsRepository,
  ) {}

  async listForSession(tenantId: string, programmeId: string, sessionId: string) {
    const session = await this.programmesRepo.findSession(tenantId, sessionId)
    if (!session || session.programmeId !== programmeId) throw new NotFoundException('Session not found')
    const records = await this.repo.listForSession(tenantId, sessionId)
    return { data: records }
  }

  async mark(tenantId: string, programmeId: string, sessionId: string, dto: MarkAttendanceDto) {
    const session = await this.programmesRepo.findSession(tenantId, sessionId)
    if (!session || session.programmeId !== programmeId) throw new NotFoundException('Session not found')

    const enrolment = await this.enrolmentsRepo.findById(tenantId, dto.enrolmentId)
    if (!enrolment || enrolment.programmeId !== programmeId) throw new NotFoundException('Enrolment not found')
    if (enrolment.status === 'cancelled') throw new BadRequestException('Cannot mark attendance for a cancelled enrolment')

    const record = await this.repo.upsert(tenantId, sessionId, dto.enrolmentId, enrolment.customerId, dto.attended, dto.notes)
    return { data: record }
  }
}
