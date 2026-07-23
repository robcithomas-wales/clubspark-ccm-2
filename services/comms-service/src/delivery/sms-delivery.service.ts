import { Injectable, Logger } from '@nestjs/common'
import { MessageLogRepository } from '../message-log/message-log.repository.js'

export interface SmsPayload {
  messageLogId: string
  to: string    // E.164 format, e.g. +447911123456
  body: string
}

/**
 * SMS Delivery Service — PILOT STUB
 * ─────────────────────────────────────────────────────────────────────────────
 * Same pattern as EmailDeliveryService — full pipeline runs, only the outbound
 * network call is stubbed.
 *
 * ─── TO INTEGRATE: Azure Communication Services SMS ─────────────────────────
 *
 *   Install: npm install @azure/communication-sms
 *
 *   import { SmsClient } from '@azure/communication-sms'
 *
 *   private readonly client = new SmsClient(
 *     process.env.AZURE_COMMUNICATION_CONNECTION_STRING
 *   )
 *
 *   async send(payload: SmsPayload): Promise<void> {
 *     const [result] = await this.client.send({
 *       from: process.env.AZURE_COMMUNICATION_PHONE_NUMBER,
 *       to: [payload.to],
 *       message: payload.body,
 *     })
 *     if (result.successful) {
 *       await this.repo.updateStatus(payload.messageLogId, 'sent', result.messageId)
 *     } else {
 *       await this.repo.updateStatus(payload.messageLogId, 'failed', undefined, result.errorMessage)
 *     }
 *   }
 *
 * ─── TO INTEGRATE: Twilio ────────────────────────────────────────────────────
 *
 *   Install: npm install twilio
 *
 *   import twilio from 'twilio'
 *   private readonly client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
 *
 *   const message = await this.client.messages.create({
 *     body: payload.body,
 *     from: process.env.TWILIO_FROM_NUMBER,
 *     to: payload.to,
 *   })
 *   await this.repo.updateStatus(payload.messageLogId, 'sent', message.sid)
 *   // Wire Twilio status webhook to POST /v1/webhooks/sms-status
 *
 * ─── Usage tracking (Premium) ────────────────────────────────────────────────
 * TODO: after integrating a real provider, record per-tenant SMS usage in a
 * comms.sms_usage table (tenant_id, month, message_count, estimated_cost).
 * Expose via GET /v1/usage/sms for the admin billing dashboard.
 */
@Injectable()
export class SmsDeliveryService {
  private readonly logger = new Logger(SmsDeliveryService.name)

  constructor(private readonly repo: MessageLogRepository) {}

  async send(payload: SmsPayload): Promise<void> {
    this.logger.log(
      `[SmsDelivery STUB] → ${payload.to} | Body: "${payload.body.slice(0, 60)}..." | logId: ${payload.messageLogId}`,
    )
    await this.repo.updateStatus(payload.messageLogId, 'sent')
  }
}
