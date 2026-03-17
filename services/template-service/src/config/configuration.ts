export const configuration = () => ({
  port: parseInt(process.env['PORT'] ?? '4000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',

  database: {
    url: process.env['DATABASE_URL'] ?? '',
    readUrl: process.env['DATABASE_READ_URL'] ?? process.env['DATABASE_URL'] ?? '',
  },

  redis: {
    url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  },

  serviceBus: {
    connectionString: process.env['SERVICE_BUS_CONNECTION_STRING'],
  },
})

export type AppConfig = ReturnType<typeof configuration>
