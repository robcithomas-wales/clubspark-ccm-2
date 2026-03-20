import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator'

export class AssignRoleDto {
  @ApiProperty({ enum: ['coach', 'committee_member', 'team_captain', 'parent', 'volunteer', 'team_manager', 'junior', 'other'] })
  @IsString()
  @IsNotEmpty()
  role!: string

  @ApiPropertyOptional({ enum: ['team', 'organisation', 'activity'] })
  @IsString()
  @IsOptional()
  contextType?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contextId?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contextLabel?: string

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startsAt?: string

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endsAt?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string
}
