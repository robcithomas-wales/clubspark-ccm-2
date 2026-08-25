import { describe, expect, it, vi } from 'vitest'
import { VenueProjectionReadsService } from '../src/projections/venue-projection-reads.service.js'

function build(
  mode: 'legacy' | 'shadow' | 'projection',
  projectedValue: unknown,
  populated = true,
) {
  const projections = {
    findVenueBookableUnit: vi.fn().mockResolvedValue(projectedValue),
    findVenueResourceGroupId: vi.fn().mockResolvedValue(projectedValue),
    getVenueResourceLighting: vi.fn().mockResolvedValue(projectedValue),
    getVenueConflictMap: vi.fn().mockResolvedValue(projectedValue),
    isSourceProjected: vi.fn().mockResolvedValue(populated),
  }
  const config = { get: vi.fn().mockReturnValue({ venueReadMode: mode }) }
  return {
    reads: new VenueProjectionReadsService(projections as never, config as never),
    projections,
  }
}

describe('VenueProjectionReadsService', () => {
  it('uses only the legacy reader by default', async () => {
    const { reads, projections } = build('legacy', 'projected')
    const legacy = vi.fn().mockResolvedValue('legacy')

    await expect(reads.findResourceGroupId('tenant', 'resource', legacy)).resolves.toBe('legacy')
    expect(legacy).toHaveBeenCalledOnce()
    expect(projections.findVenueResourceGroupId).not.toHaveBeenCalled()
  })

  it('compares in shadow mode but preserves the legacy result', async () => {
    const projected = new Map([['unit', ['unit', 'conflict']]])
    const { reads, projections } = build('shadow', projected)
    const legacy = vi.fn().mockResolvedValue(new Map([['unit', ['conflict', 'unit']]]))

    await expect(reads.getConflictMap('tenant', ['unit'], legacy)).resolves.toEqual(
      new Map([['unit', ['conflict', 'unit']]]),
    )
    expect(projections.getVenueConflictMap).toHaveBeenCalledOnce()
    expect(legacy).toHaveBeenCalledOnce()
  })

  it('refuses to answer from an unpopulated projection', async () => {
    // Every projection read returns "nothing" for an un-backfilled tenant, and for
    // conflicts that reads as "no conflict" — i.e. the double-booking guard would
    // silently switch off. Failing closed is the point.
    const { reads, projections } = build('projection', new Map(), false)
    const legacy = vi.fn().mockResolvedValue(new Map())

    await expect(reads.getConflictMap('tenant', ['unit'], legacy)).rejects.toThrow(/not populated/i)
    expect(projections.getVenueConflictMap).not.toHaveBeenCalled()
  })

  it('uses only the projection reader after cutover', async () => {
    const unit = { id: 'unit', isActive: true }
    const { reads, projections } = build('projection', unit)
    const legacy = vi.fn().mockResolvedValue(null)

    await expect(reads.findBookableUnit('tenant', 'unit', legacy)).resolves.toEqual(unit)
    expect(projections.findVenueBookableUnit).toHaveBeenCalledOnce()
    expect(legacy).not.toHaveBeenCalled()
  })
})
