import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator'

export class CreatePriceDto {
  @IsNumber()
  @Min(0)
  amount!: number

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  memberAmount?: number

  @IsOptional()
  @IsString()
  priceType?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
