import { IsOptional, IsDateString, IsString, IsEnum } from 'class-validator'
export class UpdateMatchDto {
  @IsOptional() @IsDateString() scheduledAt?: string
  @IsOptional() @IsString() venueId?: string
  @IsOptional() @IsString() resourceId?: string
  @IsOptional() @IsString() bookableUnitId?: string
  @IsOptional() @IsString() bookingId?: string
  @IsOptional() @IsEnum(['SCHEDULED','IN_PROGRESS','COMPLETED','WALKOVER','BYE','POSTPONED','CANCELLED']) status?: string
  @IsOptional() @IsString() notes?: string
}
