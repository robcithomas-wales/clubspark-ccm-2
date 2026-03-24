import { IsIn, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RespondAvailabilityDto {
  @ApiProperty({ enum: ['available', 'maybe', 'unavailable'] })
  @IsIn(['available', 'maybe', 'unavailable'])
  response!: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string
}
