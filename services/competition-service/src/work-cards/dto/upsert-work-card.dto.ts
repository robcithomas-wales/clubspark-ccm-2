import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator'

export class UpsertWorkCardDto {
  @IsString() @IsNotEmpty() personId!: string
  @IsOptional() @IsString() sport?: string
  @IsOptional() @IsString() grade?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsString() playingLevel?: string
  @IsOptional() ntrp?: number
  @IsOptional() utr?: number
  @IsOptional() ltaRating?: number
  @IsOptional() @IsDateString() eligibleFrom?: string
  @IsOptional() @IsDateString() eligibleTo?: string
  @IsOptional() @IsString() externalRef?: string
  @IsOptional() @IsString() notes?: string
}
