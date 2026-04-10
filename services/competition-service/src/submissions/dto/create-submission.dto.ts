import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class CreateSubmissionDto {
  @IsString() @IsNotEmpty() competitionId!: string
  @IsOptional() @IsString() governingBody?: string
}

export class UpdateSubmissionDto {
  @IsOptional() @IsString() externalRef?: string
  @IsOptional() @IsString() status?: string
  @IsOptional() @IsString() rejectionReason?: string
  @IsOptional() responseData?: Record<string, unknown>
}
