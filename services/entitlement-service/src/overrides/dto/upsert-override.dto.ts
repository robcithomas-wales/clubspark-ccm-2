import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator'

export class UpsertOverrideDto {
  @IsString()
  @IsNotEmpty()
  organisationId!: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  transactionFeeOverride?: number

  @IsOptional()
  @IsString()
  notes?: string
}
