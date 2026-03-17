import {
  IsString,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  IsBoolean,
  IsArray,
} from 'class-validator'

export class CreateResourceDto {
  @IsUUID()
  venueId!: string

  @IsOptional()
  @IsUUID()
  groupId?: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  resourceType!: string

  @IsOptional()
  @IsString()
  sport?: string

  @IsOptional()
  @IsString()
  surface?: string

  @IsOptional()
  @IsBoolean()
  isIndoor?: boolean

  @IsOptional()
  @IsBoolean()
  hasLighting?: boolean

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bookingPurposes?: string[]

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  colour?: string

  @IsOptional()
  isActive?: boolean
}
