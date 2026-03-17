import { IsDateString, IsOptional, IsString } from 'class-validator'

export class UpdateBookingDto {
  @IsOptional()
  @IsDateString()
  startsAt?: string

  @IsOptional()
  @IsDateString()
  endsAt?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsString()
  bookingSource?: string

  @IsOptional()
  @IsString()
  customerId?: string | null
}
