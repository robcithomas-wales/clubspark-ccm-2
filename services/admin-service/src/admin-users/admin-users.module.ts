import { Module } from '@nestjs/common'
import { AdminUsersController } from './admin-users.controller.js'
import { AdminUsersService } from './admin-users.service.js'
import { AdminUsersRepository } from './admin-users.repository.js'

@Module({
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AdminUsersRepository],
})
export class AdminUsersModule {}
