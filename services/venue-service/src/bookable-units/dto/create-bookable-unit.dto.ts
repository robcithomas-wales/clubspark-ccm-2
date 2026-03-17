import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator'

export class CreateBookableUnitDto {
  @IsString()
  @IsNotEmpty()
  venueId!: string

  @IsString()
  @IsNotEmpty()
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
  @IsString()
  parentUnitId?: string
}
