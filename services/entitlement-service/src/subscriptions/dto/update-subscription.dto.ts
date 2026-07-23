import { IsString, IsOptional, IsIn } from 'class-validator'

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  @IsIn(['core', 'growth', 'pro', 'enterprise'])
  planId?: string

  @IsOptional()
  @IsString()
  @IsIn(['monthly', 'annual'])
  billingCycle?: string

  @IsOptional()
  @IsString()
  @IsIn(['active', 'trial', 'past_due', 'cancelled'])
  status?: string
}
