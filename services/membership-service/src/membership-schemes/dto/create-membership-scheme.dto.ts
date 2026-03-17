import { IsString, IsOptional } from 'class-validator'

export class CreateMembershipSchemeDto {
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  status?: string
}
