import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator'

export class UpdateOrganisationDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  plan?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsBoolean()
  paymentConnected?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  onboardingPct?: number

  @IsOptional()
  @IsString()
  adminEmail?: string

  @IsOptional()
  @IsString()
  sport?: string

  @IsOptional()
  @IsString()
  region?: string
}
