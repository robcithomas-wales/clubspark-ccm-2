import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator'

export class CreateMembershipDto {
  @IsString()
  planId!: string

  @IsOptional()
  @IsString()
  customerId?: string

  @IsOptional()
  @IsString()
  householdId?: string

  @IsDateString()
  startDate!: string

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

  @IsOptional()
  @IsString()
  memberRole?: string
}
