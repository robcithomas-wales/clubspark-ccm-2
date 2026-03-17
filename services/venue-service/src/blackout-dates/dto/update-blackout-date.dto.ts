import { IsString, IsOptional, IsDateString } from 'class-validator'

export class UpdateBlackoutDateDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  recurrenceRule?: string
}
