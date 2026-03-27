/**
 * Fixed UUIDs used exclusively for payment-service integration tests.
 * All data created under these IDs is cleaned up after each suite.
 */
export const TEST_TENANT_ID = '60000000-0000-4000-8000-000000000011'

export const TEST_NONEXISTENT_ID = '60000000-0000-4000-8000-ffffffffffff'

// A plausible subject ID (e.g. a booking) — no real FK enforced
export const TEST_BOOKING_ID = '60000000-0000-4000-8000-000000000001'
export const TEST_CUSTOMER_ID = '60000000-0000-4000-8000-000000000002'

// Fake Stripe credentials — gateway calls will fail but service logic is testable
export const FAKE_STRIPE_CREDENTIALS = {
  secretKey: 'sk_test_fake_key_for_integration_tests',
  webhookSecret: 'whsec_fakesecretfortesting',
  publishableKey: 'pk_test_fake',
}
