import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class JoinSessionDto {
  @ApiPropertyOptional({ description: 'Customer UUID from people-service' })
  @IsOptional() @IsString()
  customerId?: string

  @ApiProperty({ example: 'Alice Smith' })
  @IsString() @IsNotEmpty()
  participantName!: string

  @ApiPropertyOptional({ example: 'alice@example.com' })
  @IsOptional() @IsEmail()
  participantEmail?: string
}
