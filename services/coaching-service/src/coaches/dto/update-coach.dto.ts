import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator'

export class UpdateCoachDto {
  @IsOptional()
  @IsString()
  displayName?: string

  @IsOptional()
  @IsString()
  bio?: string

  @IsOptional()
  @IsString()
  avatarUrl?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[]

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lessonTypeIds?: string[]
}
