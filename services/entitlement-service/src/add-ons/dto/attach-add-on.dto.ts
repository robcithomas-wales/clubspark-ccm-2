import { IsString, IsNotEmpty } from 'class-validator'

export class AttachAddOnDto {
  @IsString()
  @IsNotEmpty()
  organisationId!: string

  @IsString()
  @IsNotEmpty()
  addOnId!: string
}
