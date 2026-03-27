import { IsString, IsOptional, IsEnum } from 'class-validator'
export class SubmitResultDto {
  /** ID of the winning entry (null for draws) */
  @IsOptional() @IsString() winnerId?: string
  /** Flexible score JSON: { home: 2, away: 1 } or { sets: [{home:6,away:3},{home:7,away:5}] } */
  score!: Record<string, unknown>
  /** League points for home entry */
  @IsOptional() homePoints?: number
  /** League points for away entry */
  @IsOptional() awayPoints?: number
  @IsOptional() @IsString() notes?: string
  /** If true, admin is directly verifying (skips SUBMITTED state) */
  @IsOptional() adminVerify?: boolean
  /** The person submitting (personId or adminId) */
  @IsOptional() @IsString() submittedBy?: string
}
