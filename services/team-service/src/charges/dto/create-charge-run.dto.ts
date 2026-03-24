import { IsOptional, IsString, IsArray, IsNotEmpty } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class CreateChargeRunDto {
  @ApiPropertyOptional({ description: 'Optional notes for this charge run' })
  @IsOptional() @IsString()
  notes?: string

  @ApiPropertyOptional({
    description: 'Restrict charges to specific teamMemberIds; omit to charge all selected players',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  teamMemberIds?: string[]
}
