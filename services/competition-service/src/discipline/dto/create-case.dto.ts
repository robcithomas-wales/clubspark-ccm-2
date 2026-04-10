import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class CreateDisciplineCaseDto {
  @IsOptional() @IsString() competitionId?: string
  @IsOptional() @IsString() matchId?: string
  @IsOptional() @IsString() personId?: string
  @IsOptional() @IsString() teamId?: string
  @IsString() @IsNotEmpty() displayName!: string
  @IsString() @IsNotEmpty() description!: string
}
