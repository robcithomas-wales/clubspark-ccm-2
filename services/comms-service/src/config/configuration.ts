export const configuration = () => ({
  port: parseInt(process.env['PORT'] ?? '4012', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',

  database: {
    url: process.env['DATABASE_URL'] ?? '',
    readUrl: process.env['DATABASE_READ_URL'] ?? process.env['DATABASE_URL'] ?? '',
  },

  // Internal service URLs — used for recipient resolution (guardian routing, contact lookup)
  peopleService: {
    url: process.env['PEOPLE_SERVICE_URL'] ?? 'http://127.0.0.1:4004',
  },
  venueService: {
    url: process.env['VENUE_SERVICE_URL'] ?? 'http://127.0.0.1:4003',
  },

  // ─── Azure Service Bus (PRODUCTION) ─────────────────────────────────────────
  // When AZURE_SERVICE_BUS_CONNECTION_STRING is set, EventBusService will use
  // the Azure SDK instead of the pilot HTTP inbound endpoint.
  azureServiceBus: {
    connectionString: process.env['AZURE_SERVICE_BUS_CONNECTION_STRING'] ?? '',
    topics: (process.env['AZURE_SERVICE_BUS_TOPICS'] ?? '').split(',').filter(Boolean),
  },

  // ─── Email delivery (PRODUCTION) ────────────────────────────────────────────
  azureCommunication: {
    connectionString: process.env['AZURE_COMMUNICATION_CONNECTION_STRING'] ?? '',
    senderAddress: process.env['AZURE_COMMUNICATION_SENDER_ADDRESS'] ?? '',
    phoneNumber: process.env['AZURE_COMMUNICATION_PHONE_NUMBER'] ?? '',
  },
  resend: {
    apiKey: process.env['RESEND_API_KEY'] ?? '',
    fromAddress: process.env['RESEND_FROM_ADDRESS'] ?? '',
  },

  // ─── SMS delivery (PRODUCTION) ──────────────────────────────────────────────
  twilio: {
    accountSid: process.env['TWILIO_ACCOUNT_SID'] ?? '',
    authToken: process.env['TWILIO_AUTH_TOKEN'] ?? '',
    fromNumber: process.env['TWILIO_FROM_NUMBER'] ?? '',
  },
})

export type AppConfig = ReturnType<typeof configuration>
