import { IsDateString, IsOptional, IsString, IsArray, IsNotEmpty, IsBoolean } from 'class-validator'

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionalUnitIds?: string[]

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bookableUnitId?: string

  @IsOptional()
  @IsBoolean()
  adminOverride?: boolean
}
