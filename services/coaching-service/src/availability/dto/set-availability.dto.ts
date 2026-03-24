import { IsInt, IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class AvailabilityWindowDto {
  /** 0 = Sunday … 6 = Saturday */
  @IsInt()
  @Min(0)
  @Max(6)
  @Type(() => Number)
  dayOfWeek!: number

  /** "HH:MM" 24-hour format */
  @IsString()
  @IsNotEmpty()
  startTime!: string

  /** "HH:MM" 24-hour format */
  @IsString()
  @IsNotEmpty()
  endTime!: string

  @IsOptional()
  @IsString()
  lessonTypeId?: string
}

export class SetAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityWindowDto)
  windows!: AvailabilityWindowDto[]
}
