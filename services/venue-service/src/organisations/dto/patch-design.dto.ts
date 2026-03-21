import { IsOptional, IsString } from 'class-validator'

export class PatchDesignDto {
  @IsOptional() @IsString() primaryColour?: string
  @IsOptional() @IsString() secondaryColour?: string | null
  @IsOptional() @IsString() logoUrl?: string | null
  @IsOptional() @IsString() faviconUrl?: string | null
  @IsOptional() @IsString() headingFont?: string | null
  @IsOptional() @IsString() bodyFont?: string | null
  @IsOptional() @IsString() navLayout?: string
  @IsOptional() @IsString() portalTemplate?: string
}
