import { IsString, IsOptional, IsInt, IsISO8601, IsNumber, Min } from 'class-validator'

export class UpdateProgrammeDto {
  @IsOptional() @IsString()
  name?: string

  @IsOptional() @IsString()
  description?: string

  @IsOptional() @IsString()
  sport?: string

  @IsOptional() @IsString()
  coachId?: string

  @IsOptional() @IsString()
  venueId?: string

  @IsOptional() @IsInt() @Min(1)
  maxParticipants?: number

  @IsOptional() @IsInt() @Min(1)
  minParticipants?: number

  @IsOptional() @IsNumber()
  price?: number

  @IsOptional() @IsString()
  currency?: string

  @IsOptional() @IsISO8601()
  enrollsFrom?: string

  @IsOptional() @IsISO8601()
  enrollsUntil?: string
}
