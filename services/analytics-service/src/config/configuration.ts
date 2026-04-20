export const configuration = () => ({
  port: parseInt(process.env['PORT'] ?? '4014', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',

  database: {
    url: process.env['DATABASE_URL'] ?? '',
    readUrl: process.env['DATABASE_READ_URL'] ?? process.env['DATABASE_URL'] ?? '',
  },
})

export type AppConfig = ReturnType<typeof configuration>
