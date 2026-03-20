import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator'

export class CreateCustomerDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  id?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  addressLine1?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  addressLine2?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  county?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  postcode?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string
}
