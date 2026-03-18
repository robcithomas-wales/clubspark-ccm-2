import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class ApproveBookingDto {
  @IsString()
  @IsNotEmpty()
  approvedBy!: string
}

export class RejectBookingDto {
  @IsOptional()
  @IsString()
  reason?: string
}
