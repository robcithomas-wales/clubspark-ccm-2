import { Module } from '@nestjs/common'
import { BookableUnitsController } from './bookable-units.controller.js'
import { BookableUnitsService } from './bookable-units.service.js'
import { BookableUnitsRepository } from './bookable-units.repository.js'
import { OutboxModule } from '../outbox/outbox.module.js'

@Module({
  imports: [OutboxModule],
  controllers: [BookableUnitsController],
  providers: [BookableUnitsService, BookableUnitsRepository],
  exports: [BookableUnitsService],
})
export class BookableUnitsModule {}
