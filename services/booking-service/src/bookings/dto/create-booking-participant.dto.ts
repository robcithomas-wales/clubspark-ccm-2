import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateBookingParticipantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}
