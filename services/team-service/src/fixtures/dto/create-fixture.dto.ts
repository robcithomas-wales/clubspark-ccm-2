import { IsString, IsNotEmpty, IsOptional, IsIn, IsInt, IsDateString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateFixtureDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  opponent!: string

  @ApiProperty({ example: '2025-09-14T14:00:00Z' })
  @IsDateString()
  kickoffAt!: string

  @ApiPropertyOptional({ enum: ['home', 'away', 'neutral'] })
  @IsOptional() @IsIn(['home', 'away', 'neutral'])
  homeAway?: string

  @ApiPropertyOptional({ example: 'Kingsmeadow Stadium' })
  @IsOptional() @IsString()
  venue?: string

  @ApiPropertyOptional({ example: '2025-09-14T13:30:00Z' })
  @IsOptional() @IsDateString()
  meetTime?: string

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  durationMinutes?: number

  @ApiPropertyOptional({ example: 'League' })
  @IsOptional() @IsString()
  matchType?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  externalRef?: string
}
