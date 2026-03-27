import { IsString, IsOptional, IsISO8601, IsNumber, IsPositive } from 'class-validator'

export class UpdateSessionDto {
  @IsOptional()
  @IsISO8601()
  startsAt?: string

  @IsOptional()
  @IsISO8601()
  endsAt?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsString()
  paymentStatus?: string

  @IsOptional()
  @IsNumber()
  @IsPositive()
  priceCharged?: number

  @IsOptional()
  @IsString()
  cancellationReason?: string
}
