/**
 * Fixed UUIDs used exclusively for integration tests.
 * All data created under these IDs is cleaned up after each suite.
 */
export const TEST_TENANT_ID = '20000000-0000-4000-8000-000000000010'
export const TEST_ORG_ID    = '20000000-0000-4000-8000-000000000011'

// Pre-seeded fixture IDs (created in beforeAll, deleted in afterAll)
export const TEST_SCHEME_ID = '20000000-0000-4000-8000-000000000001'
export const TEST_PLAN_ID   = '20000000-0000-4000-8000-000000000002'

// A UUID that will never exist in the database
export const TEST_NONEXISTENT_ID = '20000000-0000-4000-8000-ffffffffffff'

// A test customer to satisfy the customer_id FK on memberships
export const TEST_CUSTOMER_ID = '20000000-0000-4000-8000-000000000099'
