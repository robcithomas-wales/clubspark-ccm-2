import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator'

export class UpdateMembershipDto {
  @IsOptional()
  @IsString()
  planId?: string

  @IsOptional()
  @IsString()
  customerId?: string

  @IsOptional()
  @IsString()
  householdId?: string

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsDateString()
  renewalDate?: string

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  paymentStatus?: string

  @IsOptional()
  @IsString()
  reference?: string

  @IsOptional()
  @IsString()
  source?: string

  @IsOptional()
  @IsString()
  notes?: string
}
