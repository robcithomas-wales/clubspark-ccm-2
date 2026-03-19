import { IsOptional, IsString, IsBoolean, IsArray, ArrayMaxSize } from 'class-validator'

export class PatchHomePageDto {
  @IsOptional() @IsString()  heroImageUrl?: string | null
  @IsOptional() @IsBoolean() heroGradient?: boolean
  @IsOptional() @IsString()  headline?: string | null
  @IsOptional() @IsString()  subheadline?: string | null
  @IsOptional() @IsBoolean() bannerEnabled?: boolean
  @IsOptional() @IsString()  bannerText?: string | null
  @IsOptional() @IsString()  introHeading?: string | null
  @IsOptional() @IsString()  introText?: string | null
  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsString({ each: true }) gallery?: string[]
  @IsOptional() @IsString()  seoTitle?: string | null
  @IsOptional() @IsString()  seoDescription?: string | null
}
