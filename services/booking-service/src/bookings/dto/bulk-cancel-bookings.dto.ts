import { IsArray, IsString, IsNotEmpty, ArrayMinSize } from 'class-validator'

export class BulkCancelBookingsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids!: string[]
}
