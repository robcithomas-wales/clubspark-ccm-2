import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common'
import { AdminUsersRepository } from './admin-users.repository.js'
import type { CreateAdminUserDto } from './dto/create-admin-user.dto.js'
import type { UpdateAdminUserDto } from './dto/update-admin-user.dto.js'

@Injectable()
export class AdminUsersService {
  constructor(private readonly repo: AdminUsersRepository) {}

  /** Returns the requesting user's admin record, or null if they have no access. */
  async getMe(tenantId: string, userId: string) {
    const admin = await this.repo.findByUserId(tenantId, userId)
    return { data: admin ?? null }
  }

  /** Lists all admin users for the tenant. Requires super role. */
  async list(tenantId: string, requestingUserId: string) {
    await this.requireSuper(tenantId, requestingUserId)
    const admins = await this.repo.list(tenantId)
    return { data: admins }
  }

  /**
   * Creates an admin user.
   * - If no admins exist yet (bootstrap), anyone can create the first one.
   * - Otherwise requires super role.
   */
  async create(tenantId: string, requestingUserId: string, dto: CreateAdminUserDto) {
    const count = await this.repo.countForTenant(tenantId)
    if (count > 0) {
      await this.requireSuper(tenantId, requestingUserId)
    }

    try {
      const admin = await this.repo.create(tenantId, dto)
      return { data: admin }
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('An admin user with this userId already exists for this tenant')
      }
      throw e
    }
  }

  /** Updates role or isActive. Requires super role. */
  async update(tenantId: string, requestingUserId: string, id: string, dto: UpdateAdminUserDto) {
    await this.requireSuper(tenantId, requestingUserId)
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Admin user not found')
    await this.repo.update(tenantId, id, dto)
    const updated = await this.repo.findById(tenantId, id)
    return { data: updated }
  }

  /** Deletes an admin user. Requires super role. Cannot delete yourself. */
  async delete(tenantId: string, requestingUserId: string, id: string) {
    await this.requireSuper(tenantId, requestingUserId)
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Admin user not found')
    if (existing.userId === requestingUserId) {
      throw new ForbiddenException('Cannot delete your own admin account')
    }
    await this.repo.delete(tenantId, id)
    return { data: null }
  }

  private async requireSuper(tenantId: string, userId: string): Promise<void> {
    const admin = await this.repo.findByUserId(tenantId, userId)
    if (!admin || admin.role !== 'super') {
      throw new ForbiddenException('Super admin role required')
    }
  }
}
