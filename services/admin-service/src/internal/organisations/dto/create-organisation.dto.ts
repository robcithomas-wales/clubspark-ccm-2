import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

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

  /** Descriptive free-text filter. NOT data residency — that is homeRegion. */
  @IsOptional()
  @IsString()
  region?: string

  /**
   * Region whose silo holds this tenant's data. Optional here only because there
   * is one region and the column defaults to it; once a second region exists,
   * tenant creation must set it explicitly — a default would silently place new
   * customers in whichever region the code was written in.
   */
  @IsOptional()
  @IsString()
  homeRegion?: string

  @IsOptional()
  @IsString()
  plan?: string

  @IsOptional()
  @IsString()
  adminEmail?: string
}
