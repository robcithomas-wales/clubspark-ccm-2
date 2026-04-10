import { IsString, IsOptional, IsEnum } from 'class-validator'

export enum DisciplineCaseStatusDto {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  APPEALED = 'APPEALED',
  CLOSED = 'CLOSED',
}

export class UpdateDisciplineCaseDto {
  @IsOptional() @IsEnum(DisciplineCaseStatusDto) status?: DisciplineCaseStatusDto
  @IsOptional() @IsString() description?: string
}
