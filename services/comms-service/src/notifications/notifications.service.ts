import { Injectable, Logger } from '@nestjs/common'
import { TemplatesService } from '../templates/templates.service.js'
import { SendRulesService } from '../send-rules/send-rules.service.js'
import { EmailDeliveryService } from '../delivery/email-delivery.service.js'
import { SmsDeliveryService } from '../delivery/sms-delivery.service.js'
import { MessageLogRepository } from '../message-log/message-log.repository.js'
import type { DomainEvent } from '../events/domain-events.js'
import { format } from 'util'

/**
 * Notifications Service
 * ──────────────────────
 * Central dispatcher for all system-triggered notifications.
 *
 * Flow for every inbound domain event:
 *   1. Map event → template key + variables + recipient contact
 *   2. Evaluate send rules (suppression, consent, guardian routing)
 *   3. Create message_log entry (status: queued)
 *   4. Render template
 *   5. Dispatch via delivery service (stub in pilot, real provider in production)
 *   6. Delivery service updates message_log status (sent | failed)
 *
 * To add a new event type:
 *   - Add the event interface to src/events/domain-events.ts
 *   - Add a case to the switch statement below
 *   - Add a system template to src/templates/seed/system-templates.seed.ts
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    private readonly templates: TemplatesService,
    private readonly sendRules: SendRulesService,
    private readonly emailDelivery: EmailDeliveryService,
    private readonly smsDelivery: SmsDeliveryService,
    private readonly messageLog: MessageLogRepository,
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    try {
      await this.dispatch(event)
    } catch (err) {
      this.logger.error(`Failed to handle event ${event.type}: ${format(err)}`)
    }
  }

  private async dispatch(event: DomainEvent): Promise<void> {
    switch (event.type) {

      // ─── Booking ─────────────────────────────────────────────────────────────

      case 'booking.confirmed':
        await this.sendEmail({
          tenantId: event.tenantId,
          templateKey: 'booking.confirmed',
          recipientEmail: event.bookerEmail,
          recipientFirstName: event.bookerFirstName,
          recipientPersonId: event.bookerPersonId,
          isTransactional: true,
          sourceEventType: event.type,
          sourceEntityId: event.bookingId,
          sourceModule: 'bookings',
          variables: {
            firstName: event.bookerFirstName,
            bookingReference: event.bookingReference,
            venueName: event.venueName,
            resourceName: event.resourceName,
            bookableUnitName: event.bookableUnitName,
            bookingDate: this.formatDate(event.startsAt),
            bookingTime: this.formatTimeRange(event.startsAt, event.endsAt),
          },
        })
        break

      case 'booking.cancelled':
        await this.sendEmail({
          tenantId: event.tenantId,
          templateKey: 'booking.cancelled',
          recipientEmail: event.bookerEmail,
          recipientFirstName: event.bookerFirstName,
          recipientPersonId: event.bookerPersonId,
          isTransactional: true,
          sourceEventType: event.type,
          sourceEntityId: event.bookingId,
          sourceModule: 'bookings',
          variables: {
            firstName: event.bookerFirstName,
            bookingReference: event.bookingReference,
            resourceName: event.resourceName,
            bookingDate: this.formatDate(event.startsAt),
          },
        })
        break

      case 'booking.reminder_due':
        // Send email + SMS for reminders (SMS is premium — delivery stub handles both)
        await this.sendEmail({
          tenantId: event.tenantId,
          templateKey: 'booking.reminder',
          recipientEmail: event.bookerEmail,
          recipientFirstName: event.bookerFirstName,
          recipientPersonId: event.bookerPersonId,
          isTransactional: false,  // reminder = marketing consent applies
          sourceEventType: event.type,
          sourceEntityId: event.bookingId,
          sourceModule: 'bookings',
          variables: {
            firstName: event.bookerFirstName,
            bookingReference: event.bookingReference,
            venueName: event.venueName,
            resourceName: event.resourceName,
            bookableUnitName: event.bookableUnitName,
            bookingDate: this.formatDate(event.startsAt),
            bookingTime: this.formatTimeRange(event.startsAt, event.endsAt),
            hoursUntil: event.hoursUntil,
          },
        })
        break

      // ─── Membership ───────────────────────────────────────────────────────────

      case 'membership.activated':
        await this.sendEmail({
          tenantId: event.tenantId,
          templateKey: 'membership.activated',
          recipientEmail: event.personEmail,
          recipientFirstName: event.personFirstName,
          recipientPersonId: event.personId,
          isTransactional: true,
          sourceEventType: event.type,
          sourceEntityId: event.membershipId,
          sourceModule: 'membership',
          variables: {
            firstName: event.personFirstName,
            planName: event.planName,
            startsAt: this.formatDate(event.startsAt),
            expiresAt: event.expiresAt ? this.formatDate(event.expiresAt) : 'No expiry',
          },
        })
        break

      case 'membership.renewal_due':
        await this.sendEmail({
          tenantId: event.tenantId,
          templateKey: 'membership.renewal_due',
          recipientEmail: event.personEmail,
          recipientFirstName: event.personFirstName,
          recipientPersonId: event.personId,
          isTransactional: false,
          sourceEventType: event.type,
          sourceEntityId: event.membershipId,
          sourceModule: 'membership',
          variables: {
            firstName: event.personFirstName,
            planName: event.planName,
            expiresAt: this.formatDate(event.expiresAt),
            renewalUrl: event.renewalUrl ?? '',
          },
        })
        break

      case 'membership.expired':
        await this.sendEmail({
          tenantId: event.tenantId,
          templateKey: 'membership.expired',
          recipientEmail: event.personEmail,
          recipientFirstName: event.personFirstName,
          recipientPersonId: event.personId,
          isTransactional: false,
          sourceEventType: event.type,
          sourceEntityId: event.membershipId,
          sourceModule: 'membership',
          variables: {
            firstName: event.personFirstName,
            planName: event.planName,
            expiredAt: this.formatDate(event.expiredAt),
          },
        })
        break

      // ─── Payment ──────────────────────────────────────────────────────────────

      case 'payment.succeeded':
        await this.sendEmail({
          tenantId: event.tenantId,
          templateKey: 'payment.succeeded',
          recipientEmail: event.personEmail,
          recipientFirstName: event.personFirstName,
          recipientPersonId: event.personId,
          isTransactional: true,
          sourceEventType: event.type,
          sourceEntityId: event.paymentId,
          sourceModule: 'payment',
          variables: {
            firstName: event.personFirstName,
            description: event.description,
            amount: event.amount.toFixed(2),
            currency: event.currency,
            receiptUrl: event.receiptUrl ?? '',
          },
        })
        break

      case 'payment.failed':
        await this.sendEmail({
          tenantId: event.tenantId,
          templateKey: 'payment.failed',
          recipientEmail: event.personEmail,
          recipientFirstName: event.personFirstName,
          recipientPersonId: event.personId,
          isTransactional: true,
          sourceEventType: event.type,
          sourceEntityId: event.paymentId,
          sourceModule: 'payment',
          variables: {
            firstName: event.personFirstName,
            description: event.description,
            amount: event.amount.toFixed(2),
            currency: event.currency,
            failureReason: event.failureReason ?? '',
          },
        })
        break

      case 'payment.refund_issued':
        await this.sendEmail({
          tenantId: event.tenantId,
          templateKey: 'payment.refund_issued',
          recipientEmail: event.personEmail,
          recipientFirstName: event.personFirstName,
          recipientPersonId: event.personId,
          isTransactional: true,
          sourceEventType: event.type,
          sourceEntityId: event.paymentId,
          sourceModule: 'payment',
          variables: {
            firstName: event.personFirstName,
            description: event.description,
            amount: event.amount.toFixed(2),
            currency: event.currency,
          },
        })
        break

      // ─── Team / Fixture ───────────────────────────────────────────────────────

      case 'fixture.reminder_due':
        await this.sendEmail({
          tenantId: event.tenantId,
          templateKey: 'fixture.reminder',
          recipientEmail: event.personEmail,
          recipientFirstName: event.personFirstName,
          recipientPersonId: event.personId,
          isTransactional: false,
          sourceEventType: event.type,
          sourceEntityId: event.fixtureId,
          sourceModule: 'teams',
          variables: {
            firstName: event.personFirstName,
            teamName: event.teamName,
            opponentName: event.opponentName,
            kickoffAt: this.formatDate(event.kickoffAt),
            location: event.location,
            hoursUntil: event.hoursUntil,
          },
        })
        break

      default: {
        const unhandled = (event as { type: string }).type
        this.logger.warn(`No handler for event type: ${unhandled}`)
      }
    }
  }

  // ─── Internal helpers ───────────────────────────────────────────────────────

  private async sendEmail(opts: {
    tenantId: string
    templateKey: string
    recipientEmail: string
    recipientFirstName: string
    recipientPersonId?: string
    isTransactional: boolean
    sourceEventType: string
    sourceEntityId: string
    sourceModule: string
    variables: Record<string, string | number | undefined>
    campaignId?: string
  }): Promise<void> {
    // 1. Evaluate send rules
    const rules = await this.sendRules.evaluate(opts.tenantId, 'email', {
      email: opts.recipientEmail,
      firstName: opts.recipientFirstName,
      isTransactional: opts.isTransactional,
      // TODO: populate isMinor + guardianEmail from people-service lookup
      // when guardian routing is needed beyond booking context.
    })

    // 2. Create message_log entry
    const log = await this.messageLog.create({
      tenantId: opts.tenantId,
      recipientEmail: rules.resolvedEmail ?? opts.recipientEmail,
      recipientName: rules.resolvedName ?? opts.recipientFirstName,
      recipientPersonId: opts.recipientPersonId,
      channel: 'email',
      templateKey: opts.templateKey,
      status: rules.eligible ? 'queued' : 'suppressed',
      sourceEventType: opts.sourceEventType,
      sourceEntityId: opts.sourceEntityId,
      sourceModule: opts.sourceModule,
      campaignId: opts.campaignId,
    })

    if (!rules.eligible) {
      this.logger.debug(`Message suppressed [${rules.reason}]: ${opts.recipientEmail}`)
      return
    }

    // 3. Render template
    const rendered = await this.templates.render(opts.tenantId, opts.templateKey, opts.variables)

    // 4. Update log with subject + preview
    await this.messageLog.updateStatus(log.id, 'queued')  // no-op status, just sets subject
    await this.messageLog['prisma'].write.messageLog.update({
      where: { id: log.id },
      data: {
        subject: rendered.subject,
        bodyPreview: rendered.htmlBody.replace(/<[^>]+>/g, '').slice(0, 200),
      },
    })

    // 5. Dispatch
    await this.emailDelivery.send({
      messageLogId: log.id,
      to: rules.resolvedEmail!,
      toName: rules.resolvedName,
      subject: rendered.subject,
      htmlBody: rendered.htmlBody,
      replyTo: rendered.replyTo,
      fromName: rendered.fromName,
    })
  }

  private formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  private formatTimeRange(startsAt: string, endsAt: string): string {
    const fmt = (d: string) =>
      new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `${fmt(startsAt)} – ${fmt(endsAt)}`
  }
}
