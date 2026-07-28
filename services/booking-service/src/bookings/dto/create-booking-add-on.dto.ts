import { IsDateString, IsOptional, IsNumber, IsString, IsNotEmpty, Min, IsInt } from 'class-validator'

export class CreateBookingAddOnDto {
  @IsString()
  @IsNotEmpty()
  addOnId!: string

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number

  @IsOptional()
  @IsString()
  currency?: string

  @IsDateString()
  startsAt!: string

  @IsDateString()
  endsAt!: string

  @IsOptional()
  @IsString()
  status?: string
}
