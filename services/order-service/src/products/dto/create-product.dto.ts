import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator'

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsString()
  @IsNotEmpty()
  productType!: string

  @IsOptional()
  @IsString()
  organisationId?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
