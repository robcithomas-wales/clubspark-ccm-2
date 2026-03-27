import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator'
export class CreateEntryDto {
  @IsOptional() @IsString() personId?: string
  @IsOptional() @IsString() teamId?: string
  @IsString() @IsNotEmpty() displayName!: string
  @IsOptional() @IsString() divisionId?: string
  @IsOptional() @IsInt() @Min(1) @Max(999) seed?: number
  @IsOptional() @IsString() notes?: string
}
