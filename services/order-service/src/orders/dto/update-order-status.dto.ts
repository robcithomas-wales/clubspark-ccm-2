import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty } from 'class-validator'

export class UpdateOrderStatusDto {
  @ApiProperty({ description: "New status: 'pending' | 'confirmed' | 'cancelled' | 'refunded'" })
  @IsString()
  @IsNotEmpty()
  status!: string
}
