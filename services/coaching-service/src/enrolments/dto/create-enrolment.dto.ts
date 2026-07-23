import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class CreateEnrolmentDto {
  @IsString() @IsNotEmpty()
  customerId!: string

  @IsOptional() @IsString()
  status?: string

  @IsOptional() @IsString()
  notes?: string
}
