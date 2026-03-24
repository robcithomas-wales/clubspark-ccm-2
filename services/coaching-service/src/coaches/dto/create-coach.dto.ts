import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator'

export class CreateCoachDto {
  /** Optional link to a person record in people-service */
  @IsOptional()
  @IsString()
  customerId?: string

  @IsString()
  @IsNotEmpty()
  displayName!: string

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

  /** Lesson type IDs this coach delivers */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lessonTypeIds?: string[]
}
