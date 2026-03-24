import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsIn } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateTeamDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  name!: string

  @ApiPropertyOptional({ enum: ['football', 'cricket', 'other'] })
  @IsOptional() @IsIn(['football', 'cricket', 'other'])
  sport?: string

  @ApiPropertyOptional({ example: '2024-25' })
  @IsOptional() @IsString()
  season?: string

  @ApiPropertyOptional({ example: 'Under 14' })
  @IsOptional() @IsString()
  ageGroup?: string

  @ApiPropertyOptional({ enum: ['male', 'female', 'mixed'] })
  @IsOptional() @IsIn(['male', 'female', 'mixed'])
  gender?: string

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  defaultMatchFee?: number

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  juniorMatchFee?: number

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  substituteMatchFee?: number

  @ApiPropertyOptional({ enum: ['selected', 'starters_only', 'all_available', 'manual'] })
  @IsOptional() @IsIn(['selected', 'starters_only', 'all_available', 'manual'])
  chargeRule?: string

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean
}
