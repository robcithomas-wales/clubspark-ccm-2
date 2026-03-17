import { PartialType } from '@nestjs/mapped-types'
import { CreateBookingRuleDto } from './create-booking-rule.dto.js'

export class UpdateBookingRuleDto extends PartialType(CreateBookingRuleDto) {}
