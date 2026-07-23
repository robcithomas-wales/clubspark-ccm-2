import { IsString, IsNotEmpty, IsOptional, IsIn, IsArray } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateSegmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ enum: ['static', 'dynamic'] })
  @IsIn(['static', 'dynamic'])
  type!: string

  /** For dynamic segments: array of { field, op, value } condition objects. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  conditions?: Record<string, unknown>[]
}
