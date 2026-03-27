import { PartialType } from '@nestjs/swagger'
import { IsOptional, IsIn, IsInt, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { CreateFixtureDto } from './create-fixture.dto.js'

export class UpdateFixtureDto extends PartialType(CreateFixtureDto) {
  @ApiPropertyOptional({ enum: ['draft', 'scheduled', 'squad_selected', 'fees_requested', 'completed', 'cancelled'] })
  @IsOptional() @IsIn(['draft', 'scheduled', 'squad_selected', 'fees_requested', 'completed', 'cancelled'])
  status?: string

  @ApiPropertyOptional({ example: 2 })
  @IsOptional() @IsInt() @Min(0)
  homeScore?: number

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @IsInt() @Min(0)
  awayScore?: number
}
