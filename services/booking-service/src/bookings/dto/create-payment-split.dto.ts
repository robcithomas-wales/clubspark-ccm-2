import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator'

export class CreatePaymentSplitDto {
  @IsString()
  @IsNotEmpty()
  payerName!: string

  @IsOptional()
  @IsString()
  payerEmail?: string

  @IsOptional()
  @IsString()
  payerPersonId?: string

  @IsNumber()
  @Min(0)
  amountDue!: number

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsString()
  notes?: string
}
