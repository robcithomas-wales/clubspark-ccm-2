import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator'

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  firstName?: string

  @IsOptional()
  @IsString()
  lastName?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean

  @IsOptional()
  @IsString()
  addressLine1?: string

  @IsOptional()
  @IsString()
  addressLine2?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  county?: string

  @IsOptional()
  @IsString()
  postcode?: string

  @IsOptional()
  @IsString()
  country?: string
}
