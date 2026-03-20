import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class ApplyTagDto {
  @IsString()
  @IsNotEmpty()
  tagId!: string

  @IsOptional()
  @IsString()
  appliedBy?: string
}
