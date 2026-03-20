import { IsString, IsIn, IsBoolean, IsOptional } from 'class-validator'
import { ADMIN_ROLES, type AdminRole } from './create-admin-user.dto.js'

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @IsIn(ADMIN_ROLES)
  role?: AdminRole

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
