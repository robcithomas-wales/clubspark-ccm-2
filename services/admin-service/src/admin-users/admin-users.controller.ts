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
  UnauthorizedException,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Req } from '@nestjs/common'
import { AdminUsersService } from './admin-users.service.js'
import { CreateAdminUserDto } from './dto/create-admin-user.dto.js'
import { UpdateAdminUserDto } from './dto/update-admin-user.dto.js'
import type { TenantContext } from '@clubspark/auth'

type RequestWithTenantContext = { tenantContext?: TenantContext }

/**
 * Every route here acts *as* the calling admin — the service uses the id to
 * check that caller's role, and to stop them deleting themselves. So the id has
 * to be real.
 *
 * `userId` is absent on a header-authenticated request that sent no
 * `x-user-id`, which is possible in tests and local dev. This guard used to
 * substitute the literal `'test-user'`; that silently turned "we don't know who
 * this is" into a permission check against a user that does not exist. Refuse
 * instead.
 */
function actingUserId(req: RequestWithTenantContext): { tenantId: string; userId: string } {
  const ctx = req.tenantContext
  if (!ctx?.userId) {
    throw new UnauthorizedException(
      'This endpoint acts on behalf of the calling admin and needs an authenticated user. ' +
        'Send a Bearer token, or an x-user-id header in test/development.',
    )
  }
  return { tenantId: ctx.tenantId, userId: ctx.userId }
}

@ApiTags('admin-users')
@Controller('admin-users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  /** Get the requesting user's own admin role. Used by portal middleware. */
  @Get('me')
  getMe(@Req() req: RequestWithTenantContext) {
    const ctx = actingUserId(req)
    return this.service.getMe(ctx.tenantId, ctx.userId)
  }

  /** List all admin users for the tenant. Super only. */
  @Get()
  list(@Req() req: RequestWithTenantContext) {
    const ctx = actingUserId(req)
    return this.service.list(ctx.tenantId, ctx.userId)
  }

  /** Create an admin user. Bootstrap (0 admins) or super only. */
  @Post()
  create(@Req() req: RequestWithTenantContext, @Body() dto: CreateAdminUserDto) {
    const ctx = actingUserId(req)
    return this.service.create(ctx.tenantId, ctx.userId, dto)
  }

  /** Update role or isActive. Super only. */
  @Patch(':id')
  update(
    @Req() req: RequestWithTenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    const ctx = actingUserId(req)
    return this.service.update(ctx.tenantId, ctx.userId, id, dto)
  }

  /** Delete an admin user. Super only. Cannot delete yourself. */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Req() req: RequestWithTenantContext, @Param('id') id: string) {
    const ctx = actingUserId(req)
    return this.service.delete(ctx.tenantId, ctx.userId, id)
  }
}
