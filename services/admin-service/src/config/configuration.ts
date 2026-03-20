export const configuration = () => ({
  port: parseInt(process.env['PORT'] ?? '4006', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',

  database: {
    url: process.env['DATABASE_URL'] ?? '',
  },
})

export type AppConfig = ReturnType<typeof configuration>
