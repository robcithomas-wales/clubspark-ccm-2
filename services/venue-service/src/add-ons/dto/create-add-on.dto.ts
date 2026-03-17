import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  Min,
} from 'class-validator'

// tenantId is intentionally absent — it is read from the x-tenant-id header by TenantContextGuard

export enum AddOnCategory {
  EQUIPMENT = 'equipment',
  SERVICE = 'service',
  PRODUCT = 'product',
  ACCESS = 'access',
}

export enum AddOnStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum AddOnPricingType {
  FIXED = 'fixed',
  INCLUDED = 'included',
  PER_UNIT = 'per_unit',
}

export enum AddOnInventoryMode {
  UNLIMITED = 'unlimited',
  LIMITED = 'limited',
  SHARED_POOL = 'shared_pool',
}

export class CreateAddOnDto {
  @IsOptional()
  @IsString()
  venueId?: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  code!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsEnum(AddOnCategory)
  category!: AddOnCategory

  @IsOptional()
  @IsEnum(AddOnStatus)
  status?: AddOnStatus

  @IsOptional()
  @IsEnum(AddOnPricingType)
  pricingType?: AddOnPricingType

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsEnum(AddOnInventoryMode)
  inventoryMode?: AddOnInventoryMode

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalInventory?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedResourceTypes?: string[]
}
