import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator'
import { RankingAlgorithmDto, RankingScopeDto } from './create-ranking-config.dto.js'

export class UpdateRankingConfigDto {
  @IsOptional() @IsEnum(RankingAlgorithmDto) algorithm?: RankingAlgorithmDto
  @IsOptional() @IsEnum(RankingScopeDto) scope?: RankingScopeDto
  @IsOptional() @IsString() season?: string
  @IsOptional() @IsInt() @Min(1) @Max(10) pointsPerWin?: number
}
