export const configuration = () => ({
  port: parseInt(process.env['PORT'] ?? '4004', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',

  database: {
    url: process.env['DATABASE_URL'] ?? '',
    readUrl: process.env['DATABASE_READ_URL'] ?? process.env['DATABASE_URL'] ?? '',
  },

  bookingService: {
    url: process.env['BOOKING_SERVICE_URL'] ?? 'http://localhost:4005',
  },

  membershipService: {
    url: process.env['MEMBERSHIP_SERVICE_URL'] ?? 'http://localhost:4010',
  },
})

export type AppConfig = ReturnType<typeof configuration>
