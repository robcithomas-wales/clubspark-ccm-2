import { IsOptional, IsNumber, IsBoolean, IsString, IsArray } from 'class-validator'

export class SetPlanEligibilityDto {
  @IsOptional()
  @IsNumber()
  minAge?: number | null

  @IsOptional()
  @IsNumber()
  maxAge?: number | null

  @IsOptional()
  @IsBoolean()
  requiresExistingMembership?: boolean

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredPlanCodes?: string[]

  @IsOptional()
  @IsString()
  notes?: string | null
}
