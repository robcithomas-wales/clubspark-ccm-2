import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Req } from '@nestjs/common'
import { AdminUsersService } from './admin-users.service.js'
import { CreateAdminUserDto } from './dto/create-admin-user.dto.js'
import { UpdateAdminUserDto } from './dto/update-admin-user.dto.js'
import type { TenantContext } from '../common/guards/tenant-context.guard.js'

type RequestWithTenantContext = { tenantContext?: TenantContext }

@ApiTags('admin-users')
@Controller('admin-users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  /** Get the requesting user's own admin role. Used by portal middleware. */
  @Get('me')
  getMe(@Req() req: RequestWithTenantContext) {
    const ctx = req.tenantContext as TenantContext
    return this.service.getMe(ctx.tenantId, ctx.userId)
  }

  /** List all admin users for the tenant. Super only. */
  @Get()
  list(@Req() req: RequestWithTenantContext) {
    const ctx = req.tenantContext as TenantContext
    return this.service.list(ctx.tenantId, ctx.userId)
  }

  /** Create an admin user. Bootstrap (0 admins) or super only. */
  @Post()
  create(@Req() req: RequestWithTenantContext, @Body() dto: CreateAdminUserDto) {
    const ctx = req.tenantContext as TenantContext
    return this.service.create(ctx.tenantId, ctx.userId, dto)
  }

  /** Update role or isActive. Super only. */
  @Patch(':id')
  update(
    @Req() req: RequestWithTenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    const ctx = req.tenantContext as TenantContext
    return this.service.update(ctx.tenantId, ctx.userId, id, dto)
  }

  /** Delete an admin user. Super only. Cannot delete yourself. */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Req() req: RequestWithTenantContext, @Param('id') id: string) {
    const ctx = req.tenantContext as TenantContext
    return this.service.delete(ctx.tenantId, ctx.userId, id)
  }
}
