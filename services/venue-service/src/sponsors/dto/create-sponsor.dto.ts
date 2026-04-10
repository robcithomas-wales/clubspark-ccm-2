import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateSponsorDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  name!: string

  @ApiProperty({ description: 'Logo image URL' })
  @IsString() @IsNotEmpty()
  logoUrl!: string

  @ApiPropertyOptional({ description: 'Sponsor website URL' })
  @IsOptional() @IsString()
  websiteUrl?: string

  @ApiPropertyOptional({ description: 'Display order in carousel (lower = earlier)', default: 0 })
  @IsOptional() @IsInt()
  displayOrder?: number

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean
}
