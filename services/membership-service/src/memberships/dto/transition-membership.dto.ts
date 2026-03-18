import { IsString, IsOptional } from 'class-validator'

// Valid actions and their target statuses:
//   activate   → active      (from: pending, suspended, lapsed)
//   suspend    → suspended   (from: active)
//   cancel     → cancelled   (from: pending, active, suspended, lapsed)
//   lapse      → lapsed      (from: active, suspended)
//   expire     → expired     (from: active, lapsed)

export class TransitionMembershipDto {
  @IsString()
  action!: 'activate' | 'suspend' | 'cancel' | 'lapse' | 'expire'

  @IsOptional()
  @IsString()
  reason?: string
}
