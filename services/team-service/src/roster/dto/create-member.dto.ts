import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsEmail, IsDateString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateMemberDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  displayName!: string

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  phone?: string

  @ApiPropertyOptional({ description: 'Soft reference to people-service person UUID' })
  @IsOptional() @IsString()
  personId?: string

  @ApiPropertyOptional({ example: 'Goalkeeper' })
  @IsOptional() @IsString()
  position?: string

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  shirtNumber?: number

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isGuest?: boolean

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isJunior?: boolean

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dateOfBirth?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  guardianName?: string

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  guardianEmail?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  guardianPhone?: string

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean
}
