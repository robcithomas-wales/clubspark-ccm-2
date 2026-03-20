import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString } from 'class-validator'

export class CreateAffiliationDto {
  @IsString()
  @IsNotEmpty()
  organisationId!: string

  @IsString()
  @IsNotEmpty()
  governingTenantId!: string

  @IsOptional()
  @IsIn(['pending', 'active', 'suspended', 'ended'])
  status?: string

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null
}
