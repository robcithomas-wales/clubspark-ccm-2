import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class StartImpersonationDto {
  @IsString()
  @IsNotEmpty()
  targetUserId!: string

  @IsOptional()
  @IsString()
  targetEmail?: string

  @IsString()
  @IsNotEmpty()
  reason!: string
}
