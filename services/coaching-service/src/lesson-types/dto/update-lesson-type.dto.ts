import { IsString, IsOptional, IsBoolean, IsInt, IsNumber, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateLessonTypeDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  sport?: string

  @IsOptional()
  @IsInt()
  @Min(5)
  @Type(() => Number)
  durationMinutes?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxParticipants?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerSession?: number

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
