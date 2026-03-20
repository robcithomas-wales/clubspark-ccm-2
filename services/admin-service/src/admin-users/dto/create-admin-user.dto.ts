import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator'

export const ADMIN_ROLES = ['super', 'bookings', 'membership', 'website', 'coaching', 'reports'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export class CreateAdminUserDto {
  @IsString()
  @IsNotEmpty()
  userId!: string

  @IsString()
  @IsIn(ADMIN_ROLES)
  role!: AdminRole

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tenantId?: string // allows super to create admin for another tenant; defaults to own tenantId
}
