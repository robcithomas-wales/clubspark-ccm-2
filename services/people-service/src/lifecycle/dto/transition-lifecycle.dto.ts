import { IsString, IsIn, IsOptional } from 'class-validator'

export const LIFECYCLE_STATES = ['prospect', 'active', 'inactive', 'lapsed', 'churned'] as const
export type LifecycleState = typeof LIFECYCLE_STATES[number]

export class TransitionLifecycleDto {
  @IsString()
  @IsIn(LIFECYCLE_STATES)
  toState!: LifecycleState

  @IsOptional()
  @IsString()
  reason?: string

  @IsOptional()
  @IsString()
  changedBy?: string
}
