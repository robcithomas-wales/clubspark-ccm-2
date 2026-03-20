import { IsString, IsOptional, IsIn, IsDateString } from 'class-validator'

export class UpdateAffiliationDto {
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
