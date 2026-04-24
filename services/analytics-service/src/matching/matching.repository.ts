import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { PlayerProfile } from './matching.algorithms.js'

@Injectable()
export class MatchingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getPlayerProfiles(tenantId: string, sport: string): Promise<PlayerProfile[]> {
    // Join people + ranking entries (if ELO config exists) + recent booking counts
    const rows = await this.prisma.write.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      WITH recent_bookings AS (
        SELECT
          customer_id,
          COUNT(*) AS booking_count
        FROM booking.bookings
        WHERE tenant_id = '${tenantId}'
          AND status NOT IN ('cancelled')
          AND starts_at >= NOW() - INTERVAL '60 days'
          AND customer_id IS NOT NULL
        GROUP BY customer_id
      ),
      elo_config AS (
        SELECT id
        FROM competitions.ranking_configs
        WHERE tenant_id = '${tenantId}'
          AND sport = '${sport}'
          AND algorithm = 'ELO'
        ORDER BY created_at DESC
        LIMIT 1
      ),
      elo_ratings AS (
        SELECT re.person_id, re.elo_rating
        FROM competitions.ranking_entries re
        WHERE re.config_id = (SELECT id FROM elo_config)
          AND re.person_id IS NOT NULL
      )
      SELECT
        p.id::text              AS person_id,
        TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS display_name,
        er.elo_rating,
        COALESCE(rb.booking_count, 0)::int AS recent_booking_count
      FROM people.persons p
      LEFT JOIN recent_bookings rb ON rb.customer_id = p.id
      LEFT JOIN elo_ratings er ON er.person_id = p.id
      WHERE p.tenant_id = '${tenantId}'
        AND (rb.booking_count > 0 OR er.elo_rating IS NOT NULL)
      ORDER BY recent_booking_count DESC
      LIMIT 500
    `)

    return rows.map(r => ({
      personId: r['person_id'] as string,
      displayName: (r['display_name'] as string) || 'Unknown',
      eloRating: r['elo_rating'] !== null && r['elo_rating'] !== undefined ? Number(r['elo_rating']) : null,
      recentBookingCount: Number(r['recent_booking_count']),
    }))
  }

  async getPersonProfile(tenantId: string, personId: string, sport: string): Promise<PlayerProfile | null> {
    const rows = await this.prisma.write.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      WITH elo_config AS (
        SELECT id
        FROM competitions.ranking_configs
        WHERE tenant_id = '${tenantId}'
          AND sport = '${sport}'
          AND algorithm = 'ELO'
        ORDER BY created_at DESC
        LIMIT 1
      ),
      elo_rating AS (
        SELECT elo_rating
        FROM competitions.ranking_entries
        WHERE config_id = (SELECT id FROM elo_config)
          AND person_id = '${personId}'
        LIMIT 1
      ),
      recent_bookings AS (
        SELECT COUNT(*) AS booking_count
        FROM booking.bookings
        WHERE tenant_id = '${tenantId}'
          AND customer_id = '${personId}'
          AND status NOT IN ('cancelled')
          AND starts_at >= NOW() - INTERVAL '60 days'
      )
      SELECT
        p.id::text AS person_id,
        TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS display_name,
        (SELECT elo_rating FROM elo_rating),
        (SELECT booking_count FROM recent_bookings)::int AS recent_booking_count
      FROM people.persons p
      WHERE p.id = '${personId}' AND p.tenant_id = '${tenantId}'
      LIMIT 1
    `)

    if (rows.length === 0) return null
    const r = rows[0]!
    return {
      personId: r['person_id'] as string,
      displayName: (r['display_name'] as string) || 'Unknown',
      eloRating: r['elo_rating'] !== null && r['elo_rating'] !== undefined ? Number(r['elo_rating']) : null,
      recentBookingCount: Number(r['recent_booking_count'] ?? 0),
    }
  }
}
