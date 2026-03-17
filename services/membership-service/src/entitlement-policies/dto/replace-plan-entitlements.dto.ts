import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator'
import { Type } from 'class-transformer'

export class PlanEntitlementItemDto {
  @IsString()
  entitlementPolicyId!: string

  @IsOptional()
  @IsString()
  scopeType?: string

  @IsOptional()
  @IsString()
  scopeId?: string

  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>

  @IsOptional()
  @IsNumber()
  priority?: number
}

export class ReplacePlanEntitlementsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanEntitlementItemDto)
  entitlements!: PlanEntitlementItemDto[]
}
