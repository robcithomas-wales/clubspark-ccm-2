export const configuration = () => ({
  port: parseInt(process.env['PORT'] ?? '4016', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',

  database: {
    url: process.env['DATABASE_URL'] ?? '',
    readUrl: process.env['DATABASE_READ_URL'] ?? process.env['DATABASE_URL'] ?? '',
  },

  apiKeyHashSecret: process.env['API_KEY_HASH_SECRET'] ?? 'dev-secret-change-in-production',

  tokenEncryptionKey: process.env['TOKEN_ENCRYPTION_KEY'] ?? 'dev-encryption-key-32-bytes-here!',

  // HMAC secret used to sign/verify OAuth `state` so a callback cannot inject an
  // arbitrary (unauthenticated) tenantId. Generate with: openssl rand -hex 32
  oauthStateSecret: process.env['OAUTH_STATE_SECRET'] ?? 'dev-oauth-state-secret-change-me',

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
