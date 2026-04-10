import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsInt, IsDateString, Min } from 'class-validator'

export enum CompetitionFormat { LEAGUE='LEAGUE', KNOCKOUT='KNOCKOUT', ROUND_ROBIN='ROUND_ROBIN', GROUP_KNOCKOUT='GROUP_KNOCKOUT', SWISS='SWISS', LADDER='LADDER' }
export enum EntryType { INDIVIDUAL='INDIVIDUAL', TEAM='TEAM', DOUBLES='DOUBLES', MIXED_DOUBLES='MIXED_DOUBLES' }

export class CreateCompetitionDto {
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsString() description?: string
  @IsString() @IsNotEmpty() sport!: string
  @IsOptional() @IsString() season?: string
  @IsEnum(CompetitionFormat) format!: CompetitionFormat
  @IsOptional() @IsEnum(EntryType) entryType?: EntryType
  @IsOptional() @IsDateString() registrationOpensAt?: string
  @IsOptional() @IsDateString() registrationClosesAt?: string
  @IsOptional() @IsDateString() lateEntryClosesAt?: string
  @IsOptional() @IsDateString() startDate?: string
  @IsOptional() @IsDateString() endDate?: string
  @IsOptional() @IsInt() @Min(2) maxEntries?: number
  @IsOptional() entryFee?: number
  @IsOptional() @IsBoolean() isPublic?: boolean
  @IsOptional() eligibilityRules?: Record<string, unknown>
  @IsOptional() tiebreakRules?: string[]
}
