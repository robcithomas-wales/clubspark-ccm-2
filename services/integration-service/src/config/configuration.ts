/**
 * Resolve a required secret. Uses the env var when set; in dev/test only, falls back to a
 * throwaway default so local work isn't blocked. In production a missing secret throws at
 * bootstrap (fail-closed) — never a committed default that silently weakens auth/encryption.
 */
const requireSecret = (value: string | undefined, name: string, devFallback: string): string => {
  if (value) return value
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(`${name} must be set in production`)
  }
  return devFallback
}

export const configuration = () => ({
  port: parseInt(process.env['PORT'] ?? '4016', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',

  database: {
    url: process.env['DATABASE_URL'] ?? '',
    readUrl: process.env['DATABASE_READ_URL'] ?? process.env['DATABASE_URL'] ?? '',
  },

  apiKeyHashSecret: requireSecret(
    process.env['API_KEY_HASH_SECRET'],
    'API_KEY_HASH_SECRET',
    'dev-secret-change-in-production',
  ),

  tokenEncryptionKey: requireSecret(
    process.env['TOKEN_ENCRYPTION_KEY'],
    'TOKEN_ENCRYPTION_KEY',
    'dev-encryption-key-32-bytes-here!',
  ),

  // HMAC secret used to sign/verify OAuth `state` so a callback cannot inject an
  // arbitrary (unauthenticated) tenantId. Generate with: openssl rand -hex 32
  oauthStateSecret: requireSecret(
    process.env['OAUTH_STATE_SECRET'],
    'OAUTH_STATE_SECRET',
    'dev-oauth-state-secret-change-me',
  ),

  xero: {
    clientId: process.env['XERO_CLIENT_ID'] ?? '',
    clientSecret: process.env['XERO_CLIENT_SECRET'] ?? '',
    redirectUri:
      process.env['XERO_REDIRECT_URI'] ??
      'http://localhost:3000/settings/integrations/accounting/xero/callback',
    scopes: 'openid profile email accounting.transactions accounting.contacts offline_access',
  },

  quickbooks: {
    clientId: process.env['QB_CLIENT_ID'] ?? '',
    clientSecret: process.env['QB_CLIENT_SECRET'] ?? '',
    redirectUri:
      process.env['QB_REDIRECT_URI'] ??
      'http://localhost:3000/settings/integrations/accounting/quickbooks/callback',
    environment: (process.env['QB_ENVIRONMENT'] ?? 'sandbox') as 'sandbox' | 'production',
  },

  adminPortalUrl: process.env['ADMIN_PORTAL_URL'] ?? 'http://localhost:3000',
})

export type AppConfig = ReturnType<typeof configuration>
