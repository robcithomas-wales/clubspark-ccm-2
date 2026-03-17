import { IsString, IsOptional, IsUUID, IsNotEmpty, IsInt, Min } from 'class-validator'

export class CreateResourceGroupDto {
  @IsUUID()
  venueId!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  sport?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  colour?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}
