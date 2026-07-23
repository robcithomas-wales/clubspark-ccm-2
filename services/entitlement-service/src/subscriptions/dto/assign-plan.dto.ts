import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator'

export class AssignPlanDto {
  @IsString()
  @IsNotEmpty()
  organisationId!: string

  @IsString()
  @IsIn(['core', 'growth', 'pro', 'enterprise'])
  planId!: string

  @IsOptional()
  @IsString()
  @IsIn(['monthly', 'annual'])
  billingCycle?: string

  @IsOptional()
  @IsString()
  @IsIn(['active', 'trial', 'past_due', 'cancelled'])
  status?: string
}
