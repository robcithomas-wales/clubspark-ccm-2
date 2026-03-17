import { IsString, IsOptional } from 'class-validator'

export class CreateEntitlementPolicyDto {
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  policyType?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  status?: string
}
