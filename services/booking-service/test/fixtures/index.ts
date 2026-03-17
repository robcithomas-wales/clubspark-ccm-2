/**
 * Fixed UUIDs used exclusively for integration tests.
 * These are deleted in full after each suite run.
 */
// Valid RFC 4122 UUIDs (version nibble in [1-8], variant nibble in [89ab])
export const TEST_TENANT_ID        = '10000000-0000-4000-8000-000000000010'
export const TEST_ORG_ID           = '10000000-0000-4000-8000-000000000011'
export const TEST_VENUE_ID         = '10000000-0000-4000-8000-000000000001'
export const TEST_RESOURCE_ID      = '10000000-0000-4000-8000-000000000002'
export const TEST_UNIT_ID          = '10000000-0000-4000-8000-000000000003'
export const TEST_UNIT_INACTIVE_ID = '10000000-0000-4000-8000-000000000004'
export const TEST_NONEXISTENT_ID   = '10000000-0000-4000-8000-ffffffffffff'

/** A time slot in the future that won't clash with any real bookings */
export const SLOT_START = '2099-06-01T10:00:00Z'
export const SLOT_END   = '2099-06-01T11:00:00Z'

/** Overlapping slot — starts during the above */
export const SLOT_OVERLAP_START = '2099-06-01T10:30:00Z'
export const SLOT_OVERLAP_END   = '2099-06-01T11:30:00Z'

/** Adjacent (non-overlapping) slot — starts exactly when the first ends */
export const SLOT_ADJACENT_START = '2099-06-01T11:00:00Z'
export const SLOT_ADJACENT_END   = '2099-06-01T12:00:00Z'
