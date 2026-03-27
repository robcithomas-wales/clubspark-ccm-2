import { IsString, IsOptional, IsBoolean, IsEnum, IsDateString } from 'class-validator'

export enum CompetitionStatus { DRAFT='DRAFT', REGISTRATION_OPEN='REGISTRATION_OPEN', IN_PROGRESS='IN_PROGRESS', COMPLETED='COMPLETED', ARCHIVED='ARCHIVED' }

export class UpdateCompetitionDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() season?: string
  @IsOptional() @IsEnum(CompetitionStatus) status?: CompetitionStatus
  @IsOptional() @IsDateString() registrationOpensAt?: string
  @IsOptional() @IsDateString() registrationClosesAt?: string
  @IsOptional() @IsDateString() startDate?: string
  @IsOptional() @IsDateString() endDate?: string
  @IsOptional() maxEntries?: number
  @IsOptional() entryFee?: number
  @IsOptional() @IsBoolean() isPublic?: boolean
  @IsOptional() tiebreakRules?: string[]
}
