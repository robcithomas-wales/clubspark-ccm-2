import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator'

export enum RankingAlgorithmDto { POINTS_TABLE = 'POINTS_TABLE', ELO = 'ELO' }
export enum RankingScopeDto { COMPETITION = 'COMPETITION', SEASON = 'SEASON', ALL_TIME = 'ALL_TIME' }

export class CreateRankingConfigDto {
  @IsString() @IsNotEmpty() sport!: string
  @IsEnum(RankingScopeDto) scope!: RankingScopeDto
  @IsEnum(RankingAlgorithmDto) algorithm!: RankingAlgorithmDto
  @IsOptional() @IsString() season?: string
  @IsOptional() @IsInt() @Min(1) @Max(10) pointsPerWin?: number
}
