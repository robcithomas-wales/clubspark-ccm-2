import { IsString, IsOptional, IsISO8601 } from 'class-validator'

export class CreateProgrammeSessionDto {
  @IsISO8601()
  startsAt!: string

  @IsISO8601()
  endsAt!: string

  @IsOptional() @IsString()
  coachId?: string

  @IsOptional() @IsString()
  bookableUnitId?: string

  @IsOptional() @IsString()
  notes?: string
}
