import { Injectable, Logger } from '@nestjs/common'
import { MessageLogRepository } from '../message-log/message-log.repository.js'

export interface EmailPayload {
  messageLogId: string
  to: string
  toName?: string
  subject: string
  htmlBody: string
  replyTo?: string
  fromName?: string
}

/**
 * Email Delivery Service — PILOT STUB
 * ─────────────────────────────────────────────────────────────────────────────
 * In pilot mode this service logs the intent and marks the message as "sent"
 * in the message log without dispatching anything.
 *
 * The full pipeline upstream of this call (send rules, template rendering,
 * audience resolution, suppression checks, message log creation) is REAL and
 * runs identically to how it will in production.
 *
 * ─── TO INTEGRATE: Azure Communication Services (recommended for Azure stack) ──
 *
 *   Install: npm install @azure/communication-email
 *
 *   import { EmailClient, KnownEmailSendStatus } from '@azure/communication-email'
 *
 *   private readonly client = new EmailClient(
 *     process.env.AZURE_COMMUNICATION_CONNECTION_STRING
 *   )
 *
 *   async send(payload: EmailPayload): Promise<void> {
 *     const poller = await this.client.beginSend({
 *       senderAddress: process.env.AZURE_COMMUNICATION_SENDER_ADDRESS,
 *       recipients: { to: [{ address: payload.to, displayName: payload.toName }] },
 *       content: { subject: payload.subject, html: payload.htmlBody },
 *       replyTo: payload.replyTo ? [{ address: payload.replyTo }] : undefined,
 *     })
 *     const result = await poller.pollUntilDone()
 *     if (result.status === KnownEmailSendStatus.Succeeded) {
 *       await this.repo.updateStatus(payload.messageLogId, 'sent', result.id)
 *     } else {
 *       await this.repo.updateStatus(payload.messageLogId, 'failed', undefined, result.error?.message)
 *     }
 *     // Wire delivery webhooks (bounce, open, click) via Azure Event Grid:
 *     // POST /v1/webhooks/email-status → MessageLogRepository.updateEngagement()
 *   }
 *
 * ─── TO INTEGRATE: Resend (alternative) ─────────────────────────────────────
 *
 *   Install: npm install resend
 *
 *   import { Resend } from 'resend'
 *   private readonly resend = new Resend(process.env.RESEND_API_KEY)
 *
 *   const { data, error } = await this.resend.emails.send({
 *     from: `${payload.fromName ?? 'ClubSpark'} <${process.env.RESEND_FROM_ADDRESS}>`,
 *     to: [payload.to],
 *     subject: payload.subject,
 *     html: payload.htmlBody,
 *     replyTo: payload.replyTo,
 *   })
 *   if (error) {
 *     await this.repo.updateStatus(payload.messageLogId, 'failed', undefined, error.message)
 *   } else {
 *     await this.repo.updateStatus(payload.messageLogId, 'sent', data?.id)
 *   }
 *   // Wire Resend webhooks to POST /v1/webhooks/email-status
 */
@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name)

  constructor(private readonly repo: MessageLogRepository) {}

  async send(payload: EmailPayload): Promise<void> {
    this.logger.log(
      `[EmailDelivery STUB] → ${payload.to} | Subject: "${payload.subject}" | logId: ${payload.messageLogId}`,
    )
    // PILOT: mark as sent immediately — no actual dispatch
    await this.repo.updateStatus(payload.messageLogId, 'sent')
  }
}
