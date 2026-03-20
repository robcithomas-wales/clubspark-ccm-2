import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator'

export class CreateHouseholdDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiPropertyOptional({ description: 'Initial member IDs to add as members' })
  @IsArray()
  @IsOptional()
  memberIds?: string[]
}

export class AddHouseholdMemberDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customerId!: string

  @ApiPropertyOptional({ enum: ['primary', 'member', 'child'] })
  @IsString()
  @IsOptional()
  role?: string
}

export class AddRelationshipDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toCustomerId!: string

  @ApiProperty({ enum: ['parent', 'guardian', 'child', 'sibling', 'spouse', 'other'] })
  @IsString()
  @IsNotEmpty()
  relationship!: string
}
