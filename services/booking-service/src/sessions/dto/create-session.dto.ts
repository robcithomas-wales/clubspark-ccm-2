import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, Min, IsUUID } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateSessionDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  venueId!: string

  @ApiProperty() @IsString() @IsNotEmpty()
  resourceId!: string

  @ApiProperty() @IsString() @IsNotEmpty()
  bookableUnitId!: string

  @ApiProperty({ example: 'Monday Padel Doubles' })
  @IsString() @IsNotEmpty()
  name!: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string

  @ApiProperty({ example: '2026-04-14T17:00:00Z' })
  @IsDateString()
  startsAt!: string

  @ApiProperty({ example: '2026-04-14T18:00:00Z' })
  @IsDateString()
  endsAt!: string

  @ApiPropertyOptional({ example: 8.00 })
  @IsOptional() @IsNumber() @Min(0)
  pricePerParticipant?: number

  @ApiPropertyOptional({ default: 'GBP' })
  @IsOptional() @IsString()
  currency?: string

  @ApiPropertyOptional({ example: 2 })
  @IsOptional() @IsNumber() @Min(1)
  minParticipants?: number

  @ApiPropertyOptional({ example: 8 })
  @IsOptional() @IsNumber() @Min(1)
  maxParticipants?: number

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  coachId?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string
}
