import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator'

export class UpdateMembershipPlanDto {
  @IsOptional()
  @IsString()
  schemeId?: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  ownershipType?: string

  @IsOptional()
  @IsString()
  durationType?: string

  @IsOptional()
  @IsString()
  visibility?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsNumber()
  sortOrder?: number

  // Phase 1: membership type & structure
  @IsOptional()
  @IsString()
  membershipType?: string

  @IsOptional()
  @IsString()
  sportCategory?: string

  @IsOptional()
  @IsNumber()
  maxMembers?: number

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean

  // Phase 1: pricing model
  @IsOptional()
  @IsString()
  pricingModel?: string

  @IsOptional()
  @IsNumber()
  price?: number

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsString()
  billingInterval?: string

  @IsOptional()
  @IsNumber()
  instalmentCount?: number

  // Phase 1: eligibility rules
  @IsOptional()
  eligibility?: Record<string, unknown>

  // Phase 2: grace period and T&C
  @IsOptional()
  @IsNumber()
  gracePeriodDays?: number

  @IsOptional()
  @IsString()
  termsAndConditions?: string
}
