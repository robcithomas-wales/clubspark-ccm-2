import { IsBoolean, IsString, IsOptional } from 'class-validator'

export class SetFlagDto {
  @IsBoolean()
  enabled!: boolean

  @IsOptional()
  @IsString()
  overrideReason?: string
}
