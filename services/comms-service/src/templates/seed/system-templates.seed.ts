/**
 * System Template Seeds
 * ─────────────────────
 * These are the built-in transactional templates seeded at service startup.
 * - isSystem = true  → locked core structure, only customFooter / replyTo editable by org
 * - channel: email   → subjectTemplate + bodyTemplate (HTML fragment)
 * - channel: sms     → smsTemplate (plain text, ≤160 chars for single segment)
 *
 * Variables use {{camelCase}} syntax, interpolated at render time.
 *
 * TODO: when integrating MJML, replace the bodyTemplate strings with MJML markup
 * and call mjml2html() in TemplatesService.render() before wrapping.
 */

export interface SystemTemplateDefinition {
  key: string
  name: string
  channel: string
  subjectTemplate?: string
  bodyTemplate?: string
  smsTemplate?: string
  variables: string[]
}

export const SYSTEM_TEMPLATES: SystemTemplateDefinition[] = [

  // ─── Booking ────────────────────────────────────────────────────────────────

  {
    key: 'booking.confirmed',
    name: 'Booking Confirmation',
    channel: 'email',
    subjectTemplate: 'Booking confirmed — {{resourceName}} on {{bookingDate}}',
    bodyTemplate: `
      <h2>Your booking is confirmed</h2>
      <p>Hi {{firstName}},</p>
      <p>Your booking has been confirmed. Here are the details:</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px 0;color:#64748b;width:40%">Reference</td><td style="padding:8px 0;font-weight:600">{{bookingReference}}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Venue</td><td style="padding:8px 0">{{venueName}}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Court / Surface</td><td style="padding:8px 0">{{resourceName}} — {{bookableUnitName}}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Date</td><td style="padding:8px 0">{{bookingDate}}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Time</td><td style="padding:8px 0">{{bookingTime}}</td></tr>
      </table>
      <p>We look forward to seeing you!</p>
    `,
    variables: ['firstName', 'bookingReference', 'venueName', 'resourceName', 'bookableUnitName', 'bookingDate', 'bookingTime'],
  },

  {
    key: 'booking.cancelled',
    name: 'Booking Cancellation',
    channel: 'email',
    subjectTemplate: 'Booking cancelled — {{resourceName}} on {{bookingDate}}',
    bodyTemplate: `
      <h2>Your booking has been cancelled</h2>
      <p>Hi {{firstName}},</p>
      <p>Your booking <strong>{{bookingReference}}</strong> for <strong>{{resourceName}}</strong> on <strong>{{bookingDate}}</strong> has been cancelled.</p>
      <p>If you did not request this cancellation or have any questions, please contact us.</p>
    `,
    variables: ['firstName', 'bookingReference', 'resourceName', 'bookingDate'],
  },

  {
    key: 'booking.reminder',
    name: 'Booking Reminder',
    channel: 'email',
    subjectTemplate: 'Reminder: {{resourceName}} booking in {{hoursUntil}} hour(s)',
    bodyTemplate: `
      <h2>Your booking is coming up</h2>
      <p>Hi {{firstName}},</p>
      <p>Just a reminder that you have a booking in <strong>{{hoursUntil}} hour(s)</strong>:</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px 0;color:#64748b;width:40%">Reference</td><td style="padding:8px 0;font-weight:600">{{bookingReference}}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Venue</td><td style="padding:8px 0">{{venueName}}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Court / Surface</td><td style="padding:8px 0">{{resourceName}} — {{bookableUnitName}}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Time</td><td style="padding:8px 0">{{bookingTime}}</td></tr>
      </table>
    `,
    smsTemplate: 'Reminder: {{resourceName}} at {{venueName}} in {{hoursUntil}}h (ref {{bookingReference}}). Reply STOP to opt out.',
    variables: ['firstName', 'bookingReference', 'venueName', 'resourceName', 'bookableUnitName', 'bookingDate', 'bookingTime', 'hoursUntil'],
  },

  // ─── Membership ─────────────────────────────────────────────────────────────

  {
    key: 'membership.activated',
    name: 'Membership Activated',
    channel: 'email',
    subjectTemplate: 'Welcome — your {{planName}} membership is active',
    bodyTemplate: `
      <h2>Your membership is now active</h2>
      <p>Hi {{firstName}},</p>
      <p>Your <strong>{{planName}}</strong> membership has been activated.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px 0;color:#64748b;width:40%">Plan</td><td style="padding:8px 0;font-weight:600">{{planName}}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Start date</td><td style="padding:8px 0">{{startsAt}}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Expires</td><td style="padding:8px 0">{{expiresAt}}</td></tr>
      </table>
      <p>Thank you for being a member!</p>
    `,
    variables: ['firstName', 'planName', 'startsAt', 'expiresAt'],
  },

  {
    key: 'membership.renewal_due',
    name: 'Membership Renewal Reminder',
    channel: 'email',
    subjectTemplate: 'Your {{planName}} membership expires on {{expiresAt}}',
    bodyTemplate: `
      <h2>Time to renew your membership</h2>
      <p>Hi {{firstName}},</p>
      <p>Your <strong>{{planName}}</strong> membership expires on <strong>{{expiresAt}}</strong>.</p>
      <p>Renew now to keep your access and benefits.</p>
      {{#if renewalUrl}}<p><a href="{{renewalUrl}}" style="display:inline-block;background:#1857E0;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Renew membership</a></p>{{/if}}
    `,
    variables: ['firstName', 'planName', 'expiresAt', 'renewalUrl'],
  },

  {
    key: 'membership.expired',
    name: 'Membership Expired',
    channel: 'email',
    subjectTemplate: 'Your {{planName}} membership has expired',
    bodyTemplate: `
      <h2>Your membership has expired</h2>
      <p>Hi {{firstName}},</p>
      <p>Your <strong>{{planName}}</strong> membership expired on <strong>{{expiredAt}}</strong>.</p>
      <p>Rejoin today to restore your access.</p>
    `,
    variables: ['firstName', 'planName', 'expiredAt'],
  },

  // ─── Payment ─────────────────────────────────────────────────────────────────

  {
    key: 'payment.succeeded',
    name: 'Payment Receipt',
    channel: 'email',
    subjectTemplate: 'Payment receipt — {{description}}',
    bodyTemplate: `
      <h2>Payment received</h2>
      <p>Hi {{firstName}},</p>
      <p>We have received your payment. Here is your receipt:</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px 0;color:#64748b;width:40%">Description</td><td style="padding:8px 0">{{description}}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Amount</td><td style="padding:8px 0;font-weight:600">{{currency}} {{amount}}</td></tr>
      </table>
      {{#if receiptUrl}}<p><a href="{{receiptUrl}}">View receipt</a></p>{{/if}}
    `,
    variables: ['firstName', 'description', 'amount', 'currency', 'receiptUrl'],
  },

  {
    key: 'payment.failed',
    name: 'Payment Failed',
    channel: 'email',
    subjectTemplate: 'Action required — payment failed for {{description}}',
    bodyTemplate: `
      <h2>Payment unsuccessful</h2>
      <p>Hi {{firstName}},</p>
      <p>We were unable to process your payment of <strong>{{currency}} {{amount}}</strong> for <strong>{{description}}</strong>.</p>
      {{#if failureReason}}<p>Reason: {{failureReason}}</p>{{/if}}
      <p>Please update your payment details to avoid losing access.</p>
    `,
    variables: ['firstName', 'description', 'amount', 'currency', 'failureReason'],
  },

  {
    key: 'payment.refund_issued',
    name: 'Refund Issued',
    channel: 'email',
    subjectTemplate: 'Refund issued — {{description}}',
    bodyTemplate: `
      <h2>Your refund has been issued</h2>
      <p>Hi {{firstName}},</p>
      <p>A refund of <strong>{{currency}} {{amount}}</strong> for <strong>{{description}}</strong> has been issued.</p>
      <p>Please allow 3–5 business days for the funds to appear in your account.</p>
    `,
    variables: ['firstName', 'description', 'amount', 'currency'],
  },

  // ─── Fixture / Team ───────────────────────────────────────────────────────────

  {
    key: 'fixture.reminder',
    name: 'Fixture Reminder',
    channel: 'email',
    subjectTemplate: 'Fixture reminder — {{teamName}} vs {{opponentName}} in {{hoursUntil}} hour(s)',
    bodyTemplate: `
      <h2>Fixture reminder</h2>
      <p>Hi {{firstName}},</p>
      <p>Your team <strong>{{teamName}}</strong> plays <strong>{{opponentName}}</strong> in <strong>{{hoursUntil}} hour(s)</strong>.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px 0;color:#64748b;width:40%">Kick-off</td><td style="padding:8px 0">{{kickoffAt}}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Location</td><td style="padding:8px 0">{{location}}</td></tr>
      </table>
      <p>Good luck!</p>
    `,
    smsTemplate: 'Reminder: {{teamName}} vs {{opponentName}} in {{hoursUntil}}h at {{location}}. Good luck!',
    variables: ['firstName', 'teamName', 'opponentName', 'kickoffAt', 'location', 'hoursUntil'],
  },
]
