import { PartialType } from '@nestjs/swagger'
import { CreateSponsorDto } from './create-sponsor.dto.js'

export class UpdateSponsorDto extends PartialType(CreateSponsorDto) {}
