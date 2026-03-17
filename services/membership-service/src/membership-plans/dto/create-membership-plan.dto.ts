import { IsString, IsOptional, IsNumber } from 'class-validator'

export class CreateMembershipPlanDto {
  @IsString()
  schemeId!: string

  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  ownershipType?: string

  @IsOptional()
  @IsString()
  durationType?: string

  @IsOptional()
  @IsString()
  visibility?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsNumber()
  sortOrder?: number
}
