import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min } from 'class-validator'
export class CreateDivisionDto {
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsEnum(['LEAGUE','KNOCKOUT','ROUND_ROBIN','GROUP_KNOCKOUT','SWISS','LADDER']) format?: string
  @IsOptional() @IsInt() @Min(2) maxEntries?: number
  @IsOptional() @IsInt() sortOrder?: number
}
