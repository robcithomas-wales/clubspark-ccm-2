import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AccountingSyncRepository } from './accounting-sync.repository.js'
import { AccountingSettingsRepository } from '../accounting-settings/accounting-settings.repository.js'
import { OAuthConnectionsService } from '../oauth-connections/oauth-connections.service.js'
import { XeroClientService } from '../accounting/xero-client.service.js'
import { QuickBooksClientService } from '../accounting/quickbooks-client.service.js'

const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 3_600_000, 14_400_000] // 30s, 2m, 10m, 1h, 4h

interface PaymentEvent {
  paymentId: string
  tenantId: string
  memberName: string
  memberEmail: string
  amountPence: number
  currency: string
  description: string
  reference?: string
}

interface RefundEvent {
  paymentId: string
  refundId: string
  tenantId: string
  memberName: string
  memberEmail: string
  amountPence: number
  currency: string
  description: string
}

@Injectable()
export class AccountingSyncService {
  private readonly logger = new Logger(AccountingSyncService.name)

  constructor(
    private readonly repo: AccountingSyncRepository,
    private readonly settingsRepo: AccountingSettingsRepository,
    private readonly connections: OAuthConnectionsService,
    private readonly xero: XeroClientService,
    private readonly qb: QuickBooksClientService,
  ) {}

  async onPaymentSucceeded(event: PaymentEvent): Promise<void> {
    const settings = await this.settingsRepo.findByTenant(event.tenantId)
    if (!settings) return

    const token = await this.connections.getActiveToken(event.tenantId, settings.provider)
    if (!token) return

    const log = await this.repo.upsertLog({
      connectionId: token.connectionId,
      tenantId: event.tenantId,
      eventType: 'payment.succeeded',
      sourceId: event.paymentId,
      sourceType: 'payment',
    })

    if (log.status !== 'pending') return

    await this.syncLogEntry(log.id, token, settings, {
      contactName: event.memberName,
      contactEmail: event.memberEmail,
      description: event.description,
      unitAmount: event.amountPence / 100,
      currencyCode: event.currency,
      invoiceMode: settings.invoiceMode,
      accountCode: settings.revenueAccountCode,
      taxType: settings.taxRateId ?? undefined,
      reference: event.reference,
    })
  }

  async onPaymentRefundIssued(event: RefundEvent): Promise<void> {
    const settings = await this.settingsRepo.findByTenant(event.tenantId)
    if (!settings) return

    const token = await this.connections.getActiveToken(event.tenantId, settings.provider)
    if (!token) return

    const log = await this.repo.upsertLog({
      connectionId: token.connectionId,
      tenantId: event.tenantId,
      eventType: 'payment.refund_issued',
      sourceId: event.refundId,
      sourceType: 'refund',
    })

    if (log.status !== 'pending') return

    await this.syncRefund(log.id, token, settings, {
      contactName: event.memberName,
      contactEmail: event.memberEmail,
      description: event.description,
      unitAmount: event.amountPence / 100,
      currencyCode: event.currency,
      accountCode: settings.revenueAccountCode,
      taxType: settings.taxRateId ?? undefined,
    })
  }

  async onMembershipActivated(event: {
    membershipId: string
    tenantId: string
    memberName: string
    memberEmail: string
    amountPence: number
    currency: string
    planName: string
  }): Promise<void> {
    const settings = await this.settingsRepo.findByTenant(event.tenantId)
    if (!settings) return

    const token = await this.connections.getActiveToken(event.tenantId, settings.provider)
    if (!token) return

    const log = await this.repo.upsertLog({
      connectionId: token.connectionId,
      tenantId: event.tenantId,
      eventType: 'membership.activated',
      sourceId: event.membershipId,
      sourceType: 'membership',
    })

    if (log.status !== 'pending') return

    await this.syncLogEntry(log.id, token, settings, {
      contactName: event.memberName,
      contactEmail: event.memberEmail,
      description: `Membership: ${event.planName}`,
      unitAmount: event.amountPence / 100,
      currencyCode: event.currency,
      invoiceMode: settings.invoiceMode,
      accountCode: settings.revenueAccountCode,
      taxType: settings.taxRateId ?? undefined,
    })
  }

  private async syncLogEntry(
    logId: string,
    token: { accessToken: string; realmId: string | null; connectionId: string },
    settings: {
      provider: string
      invoiceMode: string
      revenueAccountCode: string
      taxRateId: string | null
      currencyCode: string
    },
    input: {
      contactName: string
      contactEmail: string
      description: string
      unitAmount: number
      currencyCode: string
      invoiceMode: string
      accountCode: string
      taxType?: string
      reference?: string
    },
    currentAttempts = 0,
  ): Promise<void> {
    try {
      let providerRef: string
      if (settings.provider === 'xero') {
        const result = await this.xero.createInvoice(token.accessToken, token.realmId!, input)
        providerRef = result.invoiceId
      } else {
        const result = await this.qb.createInvoice(token.accessToken, token.realmId!, input)
        providerRef = result.invoiceId
      }
      await this.repo.markSynced(logId, providerRef)
    } catch (err) {
      const attempts = currentAttempts + 1
      const delay = RETRY_DELAYS_MS[attempts - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!
      const nextRetryAt = attempts >= 5 ? null : new Date(Date.now() + delay)
      await this.repo.markFailed(logId, (err as Error).message, attempts, nextRetryAt)
      this.logger.warn(`Sync log ${logId} failed (attempt ${attempts}): ${(err as Error).message}`)
    }
  }

  private async syncRefund(
    logId: string,
    token: { accessToken: string; realmId: string | null },
    settings: { provider: string },
    input: {
      contactName: string
      contactEmail: string
      description: string
      unitAmount: number
      currencyCode: string
      accountCode: string
      taxType?: string
    },
    currentAttempts = 0,
  ): Promise<void> {
    try {
      let providerRef: string
      if (settings.provider === 'xero') {
        const result = await this.xero.createCreditNote(token.accessToken, token.realmId!, input)
        providerRef = result.creditNoteId
      } else {
        const result = await this.qb.createCreditMemo(token.accessToken, token.realmId!, input)
        providerRef = result.creditNoteId
      }
      await this.repo.markSynced(logId, providerRef)
    } catch (err) {
      const attempts = currentAttempts + 1
      const delay = RETRY_DELAYS_MS[attempts - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!
      const nextRetryAt = attempts >= 5 ? null : new Date(Date.now() + delay)
      await this.repo.markFailed(logId, (err as Error).message, attempts, nextRetryAt)
    }
  }

  // ── Nightly batch reconciliation cron ──────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async batchReconcile(): Promise<void> {
    this.logger.log('Accounting batch reconciliation starting')
    // Five-minute leases plus SKIP LOCKED make this safe with multiple service
    // replicas. A crashed worker becomes eligible again after the lease expires.
    const rows = await this.repo.claimPendingForRetry(100, 300)
    this.logger.log(`Processing ${rows.length} pending/failed sync entries`)

    for (const row of rows) {
      try {
        const token = await this.connections.getActiveToken(row.tenantId, row.connection.provider)
        if (!token) continue

        const settings = await this.settingsRepo.findByTenant(row.tenantId)
        if (!settings) continue

        if (row.sourceType === 'refund') {
          await this.syncRefund(
            row.id,
            token,
            settings,
            {
              contactName: 'Member',
              contactEmail: 'noreply@placeholder.com',
              description: `Refund: ${row.sourceId}`,
              unitAmount: 0,
              currencyCode: settings.currencyCode,
              accountCode: settings.revenueAccountCode,
            },
            row.attempts,
          )
        } else {
          await this.syncLogEntry(
            row.id,
            token,
            settings,
            {
              contactName: 'Member',
              contactEmail: 'noreply@placeholder.com',
              description: `${row.sourceType}: ${row.sourceId}`,
              unitAmount: 0,
              currencyCode: settings.currencyCode,
              invoiceMode: settings.invoiceMode,
              accountCode: settings.revenueAccountCode,
            },
            row.attempts,
          )
        }
      } catch (err) {
        this.logger.error(`Batch reconcile failed for log ${row.id}: ${(err as Error).message}`)
      }
    }

    this.logger.log('Accounting batch reconciliation complete')
  }

  async listSyncLog(tenantId: string, page = 1, limit = 50) {
    const { data, total } = await this.repo.listByTenant(tenantId, page, limit)
    return {
      data: data.map((r) => ({
        id: r.id,
        eventType: r.eventType,
        sourceId: r.sourceId,
        sourceType: r.sourceType,
        status: r.status,
        providerRef: r.providerRef,
        attempts: r.attempts,
        errorMessage: r.errorMessage,
        syncedAt: r.syncedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }
}
