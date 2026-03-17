import { IsIn } from 'class-validator'

export const PAYMENT_STATUSES = ['free', 'paid', 'unpaid', 'refunded', 'pending'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export class UpdatePaymentStatusDto {
  @IsIn(PAYMENT_STATUSES)
  paymentStatus!: PaymentStatus
}
