import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEmail, IsIn, Matches, MinLength } from 'class-validator'

export type TenantType = 'enterprise' | 'operator' | 'club'

export class PublicRegisterDto {
  @IsString() @IsNotEmpty() tenantId!: string
  @IsEmail()               email!: string
  @IsString() @MinLength(8) password!: string
  @IsString() @IsNotEmpty() firstName!: string
  @IsString() @IsNotEmpty() lastName!: string
}

export class UpsertOrganisationDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug may only contain lowercase letters, numbers and hyphens' })
  slug!: string

  @IsOptional()
  @IsString()
  customDomain?: string | null

  @IsOptional()
  @IsString()
  primaryColour?: string

  @IsOptional()
  @IsString()
  logoUrl?: string | null

  @IsOptional()
  @IsString()
  about?: string | null

  @IsOptional()
  @IsString()
  address?: string | null

  @IsOptional()
  @IsString()
  phone?: string | null

  @IsOptional()
  @IsEmail()
  email?: string | null

  @IsOptional()
  @IsString()
  mapsEmbedUrl?: string | null

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean

  @IsOptional()
  @IsString()
  appName?: string | null

  @IsOptional()
  @IsString()
  clubCode?: string | null

  @IsOptional()
  @IsString()
  secondaryColour?: string | null

  @IsOptional()
  @IsString()
  headingFont?: string | null

  @IsOptional()
  @IsString()
  bodyFont?: string | null

  @IsOptional()
  @IsString()
  navLayout?: string

  @IsOptional()
  @IsString()
  faviconUrl?: string | null

  @IsOptional()
  @IsString()
  portalTemplate?: string

  @IsOptional()
  @IsIn(['enterprise', 'operator', 'club'])
  tenantType?: TenantType
}
