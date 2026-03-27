export const configuration = () => ({
  port: parseInt(process.env['PORT'] ?? '4009', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  database: {
    url: process.env['DATABASE_URL'] ?? '',
  },
  bookingService: {
    url: process.env['BOOKING_SERVICE_URL'] ?? 'http://localhost:4005',
    defaultTenantId: process.env['DEFAULT_TENANT_ID'] ?? '',
    defaultOrgId: process.env['DEFAULT_ORG_ID'] ?? '',
  },
})
export type AppConfig = ReturnType<typeof configuration>
