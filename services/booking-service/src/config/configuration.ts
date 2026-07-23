export const configuration = () => ({
  port: parseInt(process.env['PORT'] ?? '4005', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',

  database: {
    url: process.env['DATABASE_URL'] ?? '',
    readUrl: process.env['DATABASE_READ_URL'] ?? process.env['DATABASE_URL'] ?? '',
  },

  venueService: {
    url: process.env['VENUE_SERVICE_URL'] ?? 'http://localhost:4003',
    defaultTenantId: process.env['DEFAULT_TENANT_ID'] ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    defaultOrgId: process.env['DEFAULT_ORG_ID'] ?? '11111111-1111-1111-1111-111111111111',
  },

  membershipService: {
    url: process.env['MEMBERSHIP_SERVICE_URL'] ?? 'http://localhost:4010',
  },

  commsService: {
    url: process.env['COMMS_SERVICE_URL'] ?? 'http://localhost:4012',
  },

  peopleService: {
    url: process.env['PEOPLE_SERVICE_URL'] ?? 'http://localhost:4004',
  },

  integrationService: {
    url: process.env['INTEGRATION_SERVICE_URL'] ?? 'http://localhost:4016',
  },
})

export type AppConfig = ReturnType<typeof configuration>
