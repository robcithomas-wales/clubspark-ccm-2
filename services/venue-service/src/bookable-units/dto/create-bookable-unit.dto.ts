import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator'

export class CreateBookableUnitDto {
  @IsUUID()
  venueId!: string

  @IsUUID()
  resourceId!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  unitType!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsBoolean()
  isOptionalExtra?: boolean

  @IsOptional()
  @IsUUID()
  parentUnitId?: string
}
