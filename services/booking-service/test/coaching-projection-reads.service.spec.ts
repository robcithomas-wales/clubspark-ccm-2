import { describe, expect, it, vi } from 'vitest'
import { CoachingProjectionReadsService } from '../src/projections/coaching-projection-reads.service.js'

function build(
  mode: 'legacy' | 'shadow' | 'projection',
  projected: { id: string }[],
  populated = true,
) {
  const repository = {
    getCoachingConflicts: vi.fn().mockResolvedValue(projected),
    isSourceProjected: vi.fn().mockResolvedValue(populated),
  }
  const config = { get: vi.fn().mockReturnValue({ coachingReadMode: mode }) }
  return {
    reads: new CoachingProjectionReadsService(repository as never, config as never),
    repository,
  }
}

describe('CoachingProjectionReadsService', () => {
  it('keeps the legacy query as the default', async () => {
    const { reads, repository } = build('legacy', [{ id: 'projected' }])
    const legacy = vi.fn().mockResolvedValue([{ id: 'legacy' }])
    await expect(
      reads.getConflicts(
        'tenant',
        ['unit'],
        '2026-08-24T10:00:00Z',
        '2026-08-24T11:00:00Z',
        legacy,
      ),
    ).resolves.toEqual([{ id: 'legacy' }])
    expect(repository.getCoachingConflicts).not.toHaveBeenCalled()
  })

  it('refuses to answer from an unpopulated projection', async () => {
    // No occupancy rows would otherwise read as "no coaching session in the way",
    // and the booking would be written straight over one.
    const { reads, repository } = build('projection', [], false)
    await expect(
      reads.getConflicts(
        'tenant',
        ['unit'],
        '2026-08-24T10:00:00Z',
        '2026-08-24T11:00:00Z',
        vi.fn(),
      ),
    ).rejects.toThrow(/not populated/i)
    expect(repository.getCoachingConflicts).not.toHaveBeenCalled()
  })

  it('uses only Booking projection data after cutover', async () => {
    const projected = [{ id: 'projected' }]
    const { reads } = build('projection', projected)
    const legacy = vi.fn()
    await expect(
      reads.getConflicts(
        'tenant',
        ['unit'],
        '2026-08-24T10:00:00Z',
        '2026-08-24T11:00:00Z',
        legacy,
      ),
    ).resolves.toEqual(projected)
    expect(legacy).not.toHaveBeenCalled()
  })
})
