import { IsArray, IsIn, IsOptional, IsString, IsInt, ValidateNested, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SelectionEntryDto {
  @ApiProperty()
  @IsString()
  teamMemberId!: string

  @ApiProperty({ enum: ['starter', 'substitute', 'reserve'] })
  @IsIn(['starter', 'substitute', 'reserve'])
  role!: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  position?: string

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  shirtNumber?: number
}

export class SetSelectionDto {
  @ApiProperty({ type: [SelectionEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectionEntryDto)
  players!: SelectionEntryDto[]

  @ApiPropertyOptional({ description: 'Publish selection immediately (triggers broadcast)' })
  @IsOptional() @IsBoolean()
  publish?: boolean
}
