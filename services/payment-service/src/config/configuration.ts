/**
 * Resolve a required secret. Uses the env var when set; in dev/test only, falls back to a
 * throwaway default so local work isn't blocked. Anywhere else (staging, production, or an
 * unset NODE_ENV) a missing secret throws at bootstrap (fail-closed) — never a committed
 * default that silently weakens encryption. Deny-list polarity matches the tenant and
 * internal-secret guards.
 */
const requireSecret = (value: string | undefined, name: string, devFallback: string): string => {
  if (value) return value
  if (process.env['NODE_ENV'] !== 'development' && process.env['NODE_ENV'] !== 'test') {
    throw new Error(`${name} must be set outside development/test`)
  }
  return devFallback
}

export const configuration = () => ({
  port: parseInt(process.env['PORT'] ?? '4011', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',

  database: {
    url: process.env['DATABASE_URL'] ?? '',
    readUrl: process.env['DATABASE_READ_URL'] ?? process.env['DATABASE_URL'] ?? '',
  },

  tokenEncryptionKey: requireSecret(
    process.env['TOKEN_ENCRYPTION_KEY'],
    'TOKEN_ENCRYPTION_KEY',
    'dev-encryption-key-32-bytes-here!',
  ),
})

export type AppConfig = ReturnType<typeof configuration>
