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
}
