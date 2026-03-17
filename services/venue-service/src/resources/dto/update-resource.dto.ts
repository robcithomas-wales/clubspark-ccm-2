import {
  IsString,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  IsBoolean,
  IsArray,
} from 'class-validator'

export class UpdateResourceDto {
  @IsOptional()
  @IsUUID()
  groupId?: string | null

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @IsOptional()
  @IsString()
  resourceType?: string

  @IsOptional()
  @IsString()
  sport?: string

  @IsOptional()
  @IsString()
  surface?: string

  @IsOptional()
  @IsBoolean()
  isIndoor?: boolean | null

  @IsOptional()
  @IsBoolean()
  hasLighting?: boolean | null

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
  @IsBoolean()
  isActive?: boolean
}
