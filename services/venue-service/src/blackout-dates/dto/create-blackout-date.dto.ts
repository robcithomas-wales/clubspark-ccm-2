import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator'

export class CreateBlackoutDateDto {
  @IsString()
  @IsNotEmpty()
  venueId!: string

  @IsOptional()
  @IsString()
  resourceId?: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsDateString()
  startDate!: string

  @IsDateString()
  endDate!: string

  @IsOptional()
  @IsString()
  recurrenceRule?: string
}
