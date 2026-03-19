import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator'

export class UpsertNewsPostDto {
  @IsString() @IsNotEmpty()
  title!: string

  @IsOptional() @IsString()
  body?: string | null

  @IsOptional() @IsString()
  coverImageUrl?: string | null

  @IsOptional() @IsBoolean()
  published?: boolean
}
