import { IsString, IsOptional } from 'class-validator'

export class UpdateMembershipSchemeDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  status?: string
}
