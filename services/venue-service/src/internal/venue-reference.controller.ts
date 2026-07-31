import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'
import { IsArray, IsString, IsOptional, ArrayMaxSize } from 'class-validator'
import { SkipTenant } from '../common/decorators/skip-tenant.decorator.js'
import { InternalSecretGuard } from '../common/guards/internal-secret.guard.js'
import { VenueReferenceService } from './venue-reference.service.js'

/** Body for the internal reference lookup. Each list is optional. */
export class VenueReferenceDto {
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsString({ each: true })
  venueIds?: string[]

  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsString({ each: true })
  resourceIds?: string[]

  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsString({ each: true })
  bookableUnitIds?: string[]
}

/**
 * Reference data for other services, in one round trip.
 *
 * Exists so booking-service can stop JOINing `venue.venues`, `venue.resources`
 * and `venue.bookable_units` inside its own SQL. Those joins cannot execute once
 * the two schemas live in separate regional databases — see
 * docs/roadmap/multi-region-readiness-backlog.md (MR-3).
 *
 * One endpoint taking three id lists rather than three endpoints: booking needs
 * all three to render a booking row, and three round trips per page would be
 * worse than the JOIN it is replacing.
 *
 * `@SkipTenant()` because a service-to-service caller has no end-user JWT;
 * InternalSecretGuard authenticates and the tenant comes from the header. Every
 * query is still tenant-scoped.
 */
@Controller('venue-reference')
export class VenueReferenceController {
  constructor(private readonly service: VenueReferenceService) {}

  @Post('internal/batch')
  @SkipTenant()
  @UseGuards(InternalSecretGuard)
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  batch(@Headers('x-tenant-id') tenantId: string | undefined, @Body() dto: VenueReferenceDto) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required')
    return this.service.lookup(tenantId, dto)
  }
}
