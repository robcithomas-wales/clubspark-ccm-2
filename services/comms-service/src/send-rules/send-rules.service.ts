import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

export interface SendRuleResult {
  eligible: boolean
  reason?: string  // populated when eligible = false
}

export interface RecipientContact {
  email?: string
  phone?: string
  firstName?: string
  isMinor?: boolean
  guardianEmail?: string
  guardianFirstName?: string
  isTransactional: boolean  // transactional = bypasses marketing unsubscribe
}

/**
 * Send Rules Engine
 * ─────────────────
 * Evaluated before every outbound message. Rules applied in order:
 *
 *  1. Valid contact data  — recipient must have a valid email (or phone for SMS)
 *  2. Suppression check   — org-level unsubscribes, bounces, spam complaints
 *  3. Transactional bypass— transactional messages skip marketing suppression
 *  4. Guardian routing    — minors without guardians are excluded for non-booking comms
 *
 * This logic is fully implemented in the pilot. In production, no changes needed here —
 * only the delivery layer changes (stub → real provider).
 */
@Injectable()
export class SendRulesService {
  private readonly logger = new Logger(SendRulesService.name)

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(
    tenantId: string,
    channel: 'email' | 'sms',
    contact: RecipientContact,
  ): Promise<SendRuleResult & { resolvedEmail?: string; resolvedPhone?: string; resolvedName?: string }> {

    const target = channel === 'email' ? contact.email : contact.phone

    // ── Rule 1: valid contact data ────────────────────────────────────────────
    if (!target) {
      return { eligible: false, reason: `no_${channel}_address` }
    }

    if (channel === 'email' && !this.isValidEmail(target)) {
      return { eligible: false, reason: 'invalid_email_format' }
    }

    // ── Rule 2: guardian routing for minors ───────────────────────────────────
    // Non-transactional messages to minors route to guardian.
    // If no guardian exists, recipient is excluded.
    let resolvedEmail = contact.email
    let resolvedName = contact.firstName
    let resolvedPhone = contact.phone

    if (contact.isMinor && !contact.isTransactional) {
      if (!contact.guardianEmail) {
        this.logger.debug(`Excluding minor with no guardian — ${contact.email}`)
        return { eligible: false, reason: 'minor_no_guardian' }
      }
      // Route to guardian
      resolvedEmail = contact.guardianEmail
      resolvedName = contact.guardianFirstName ?? resolvedName
      this.logger.debug(`Routing minor comms to guardian: ${resolvedEmail}`)
    }

    // ── Rule 3: suppression check ─────────────────────────────────────────────
    // Transactional messages bypass marketing suppression but NOT bounce/spam suppression.
    const suppressionWhere = contact.isTransactional
      ? {
          tenantId,
          channel: { in: [channel, 'all'] as string[] },
          reason: { in: ['bounced', 'spam_complaint'] as string[] },
          ...(channel === 'email' ? { email: resolvedEmail } : { phone: resolvedPhone }),
        }
      : {
          tenantId,
          channel: { in: [channel, 'all'] as string[] },
          ...(channel === 'email' ? { email: resolvedEmail } : { phone: resolvedPhone }),
        }

    const suppressed = await this.prisma.read.suppression.findFirst({
      where: suppressionWhere,
    })

    if (suppressed) {
      this.logger.debug(`Suppressed: ${resolvedEmail} — reason: ${suppressed.reason}`)
      return { eligible: false, reason: `suppressed_${suppressed.reason}` }
    }

    return { eligible: true, resolvedEmail, resolvedPhone, resolvedName }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
}
