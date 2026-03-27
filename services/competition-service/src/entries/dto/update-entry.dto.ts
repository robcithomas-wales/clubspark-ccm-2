import { IsString, IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator'
export class UpdateEntryDto {
  @IsOptional() @IsString() displayName?: string
  @IsOptional() @IsInt() @Min(1) @Max(999) seed?: number
  @IsOptional() @IsEnum(['PENDING','CONFIRMED','WITHDRAWN','DISQUALIFIED']) status?: string
  @IsOptional() @IsString() paymentStatus?: string
  @IsOptional() @IsString() withdrawnReason?: string
  @IsOptional() @IsString() divisionId?: string
}
