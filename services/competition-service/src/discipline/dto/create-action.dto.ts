import { IsString, IsOptional, IsEnum, IsInt, IsDateString, Min } from 'class-validator'

export enum DisciplineOutcomeDto {
  WARNING = 'WARNING',
  FINE = 'FINE',
  MATCH_BAN = 'MATCH_BAN',
  COMPETITION_BAN = 'COMPETITION_BAN',
  SUSPENSION = 'SUSPENSION',
  DISQUALIFICATION = 'DISQUALIFICATION',
  NO_ACTION = 'NO_ACTION',
}

export class CreateDisciplineActionDto {
  @IsEnum(DisciplineOutcomeDto) outcome!: DisciplineOutcomeDto
  @IsOptional() @IsInt() @Min(1) banMatches?: number
  @IsOptional() @IsDateString() suspendedUntil?: string
  @IsOptional() fineAmount?: number
  @IsOptional() @IsString() notes?: string
}
