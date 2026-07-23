import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { EnrolmentsRepository } from './enrolments.repository.js'
import { ProgrammesRepository } from '../programmes/programmes.repository.js'
import { OrderClient } from '../order-client/order.client.js'
import type { CreateEnrolmentDto } from './dto/create-enrolment.dto.js'

@Injectable()
export class EnrolmentsService {
  constructor(
    private readonly repo: EnrolmentsRepository,
    private readonly programmesRepo: ProgrammesRepository,
    private readonly orderClient: OrderClient,
  ) {}

  async listForProgramme(tenantId: string, programmeId: string) {
    const programme = await this.programmesRepo.findById(tenantId, programmeId)
    if (!programme) throw new NotFoundException('Programme not found')
    const enrolments = await this.repo.listForProgramme(tenantId, programmeId)
    return { data: enrolments }
  }

  async enrol(tenantId: string, programmeId: string, dto: CreateEnrolmentDto) {
    const programme = await this.programmesRepo.findById(tenantId, programmeId)
    if (!programme) throw new NotFoundException('Programme not found')
    if (programme.status !== 'published') throw new BadRequestException('Enrolment is not open for this programme')

    const existing = await this.repo.findByProgrammeAndCustomer(programmeId, dto.customerId)
    if (existing && existing.status !== 'cancelled') throw new ConflictException('Customer is already enrolled')

    const confirmedCount = await this.repo.countConfirmed(programmeId)
    const status = confirmedCount >= programme.maxParticipants ? 'waitlisted' : (dto.status ?? 'confirmed')

    const enrolment = existing
      ? await this.repo.updateStatus(existing.id, status)
      : await this.repo.create(tenantId, programmeId, dto.customerId, status, dto.notes)

    if (status === 'confirmed' && Number(programme.price) > 0) {
      void this.orderClient.createOrder({
        tenantId,
        subjectType: 'enrolment',
        subjectId: enrolment.id,
        currency: programme.currency,
        idempotencyKey: `enrolment:${enrolment.id}`,
        items: [{
          productType: 'programme_enrolment',
          description: `Enrolment: ${programme.name}`,
          unitAmount: Math.round(Number(programme.price) * 100),
          quantity: 1,
        }],
      }).then((order) => { if (order) this.repo.setOrderId(enrolment.id, order.id) })
    }

    return { data: enrolment }
  }

  async cancel(tenantId: string, programmeId: string, enrolmentId: string) {
    const programme = await this.programmesRepo.findById(tenantId, programmeId)
    if (!programme) throw new NotFoundException('Programme not found')
    const enrolment = await this.repo.findById(tenantId, enrolmentId)
    if (!enrolment || enrolment.programmeId !== programmeId) throw new NotFoundException('Enrolment not found')
    if (enrolment.status === 'cancelled') throw new BadRequestException('Enrolment is already cancelled')
    const updated = await this.repo.updateStatus(enrolmentId, 'cancelled')
    return { data: updated }
  }
}
