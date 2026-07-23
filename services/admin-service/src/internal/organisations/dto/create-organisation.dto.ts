import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator'

export class CreateOrganisationDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsOptional()
  @IsString()
  sport?: string

  @IsOptional()
  @IsString()
  region?: string

  @IsOptional()
  @IsString()
  plan?: string

  @IsOptional()
  @IsString()
  adminEmail?: string
}
