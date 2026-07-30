import { IsString, IsNotEmpty } from 'class-validator'

/**
 * Re-points every booking for one customer id onto another, within a tenant.
 *
 * Used by people-service when two person records are merged. Booking owns
 * booking.bookings, so the update must happen here rather than people-service
 * reaching across schemas — see docs/architecture/cross-schema-coupling-inventory.md.
 */
export class ReassignCustomerDto {
  /** The customer id currently on the bookings. */
  @IsString()
  @IsNotEmpty()
  fromCustomerId!: string

  /** The customer id the bookings should point at. */
  @IsString()
  @IsNotEmpty()
  toCustomerId!: string
}
