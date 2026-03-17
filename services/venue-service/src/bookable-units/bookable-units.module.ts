import { Module } from '@nestjs/common'
import { BookableUnitsController } from './bookable-units.controller.js'
import { BookableUnitsService } from './bookable-units.service.js'
import { BookableUnitsRepository } from './bookable-units.repository.js'

@Module({
  controllers: [BookableUnitsController],
  providers: [BookableUnitsService, BookableUnitsRepository],
  exports: [BookableUnitsService],
})
export class BookableUnitsModule {}
