# Communications Service — Azure Migration Guide

This document explains what is stubbed in the pilot and exactly what to do when migrating to Azure.

---

## Architecture Overview

```
Booking / Membership / Payment services
         │  void this.eventBus.publish(event)
         ▼
  EventBusService  ──[pilot]──▶  HTTP POST /v1/events/inbound
                   ──[prod]───▶  Azure Service Bus Topic: domain-events
                                          │
                                          ▼ (subscription per consumer)
                                  comms-service subscriber
                                          │
                                          ▼
                              NotificationsService.handle(event)
                                          │
                          ┌───────────────┼────────────────┐
                          ▼               ▼                ▼
                   Send Rules       Template Engine   MessageLog (Prisma)
                          │
                   EmailDelivery / SmsDelivery
                          │
               [pilot] logs to stdout
               [prod]  Azure Communication Services / Twilio
```

---

## Step 1 — Replace EventBusService (Publisher Side)

**File in each publisher service:** `src/event-bus/event-bus.service.ts`

Each service currently does:
```typescript
await fetch(`${this.commsUrl}/v1/events/inbound`, { method: 'POST', body })
```

Replace with Azure Service Bus:
```typescript
import { ServiceBusClient } from '@azure/service-bus'

const client = new ServiceBusClient(process.env.AZURE_SERVICE_BUS_CONNECTION_STRING)
const sender = client.createSender('domain-events')   // topic name

await sender.sendMessages({ body: event, contentType: 'application/json' })
await sender.close()
```

**Environment variables to add:**
```
AZURE_SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://your-namespace.servicebus.windows.net/;SharedAccessKeyName=...;SharedAccessKey=...
```

---

## Step 2 — Replace HTTP Inbound Endpoint (Subscriber Side)

**File:** `services/comms-service/src/events/events.controller.ts`

Currently: `POST /v1/events/inbound` — a REST endpoint for pilot HTTP delivery.

Replace with an Azure Service Bus subscription processor in `app.module.ts`:
```typescript
import { ServiceBusClient } from '@azure/service-bus'

// In AppModule.onModuleInit():
const client = new ServiceBusClient(process.env.AZURE_SERVICE_BUS_CONNECTION_STRING)
const receiver = client.createReceiver('domain-events', 'comms-service') // topic + subscription name

receiver.subscribe({
  processMessage: async (msg) => {
    await this.notificationsService.handle(msg.body as DomainEvent)
  },
  processError: async (err) => {
    this.logger.error('Service Bus error', err.error)
  },
})
```

Create the subscription in Azure Portal (or Bicep/Terraform):
- Topic: `domain-events`
- Subscription: `comms-service`
- No filter (receives all events)

---

## Step 3 — Replace Email Delivery Stub

**File:** `services/comms-service/src/delivery/email-delivery.service.ts`

The stub currently logs and marks `sent`. Replace the body of `send()` with:

**Option A — Azure Communication Services:**
```typescript
import { EmailClient } from '@azure/communication-email'

const client = new EmailClient(process.env.AZURE_COMMUNICATION_CONNECTION_STRING)

const poller = await client.beginSend({
  senderAddress: process.env.EMAIL_FROM_ADDRESS,
  recipients: { to: [{ address: to, displayName: recipientName }] },
  content: {
    subject,
    html: htmlBody,
    plainText: plainBody,
  },
  replyTo: replyTo ? [{ address: replyTo }] : undefined,
})

const result = await poller.pollUntilDone()
// result.id is the Azure message ID — store in MessageLog.externalId
```

**Environment variables:**
```
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://your-resource.communication.azure.com/;accesskey=...
EMAIL_FROM_ADDRESS=noreply@yourclub.com
EMAIL_FROM_NAME=YourClub
```

**Option B — Resend (simpler for pilot-to-production):**
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const { data } = await resend.emails.send({
  from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
  to,
  subject,
  html: htmlBody,
  reply_to: replyTo,
})
// data.id → store in MessageLog.externalId
```

**Environment variables:**
```
RESEND_API_KEY=re_...
EMAIL_FROM_ADDRESS=noreply@yourclub.com
EMAIL_FROM_NAME=YourClub
```

---

## Step 4 — Replace SMS Delivery Stub

**File:** `services/comms-service/src/delivery/sms-delivery.service.ts`

**Option A — Azure Communication Services SMS:**
```typescript
import { SmsClient } from '@azure/communication-sms'

const client = new SmsClient(process.env.AZURE_COMMUNICATION_CONNECTION_STRING)
const results = await client.send({
  from: process.env.SMS_FROM_NUMBER,
  to: [to],
  message: body,
})
// results[0].successful → update MessageLog
```

**Option B — Twilio:**
```typescript
import twilio from 'twilio'

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
const msg = await client.messages.create({
  from: process.env.TWILIO_FROM_NUMBER,
  to,
  body,
})
// msg.sid → MessageLog.externalId
```

**Environment variables:**
```
SMS_FROM_NUMBER=+447700000000   # or Twilio number
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+447700000000
```

---

## Step 5 — Replace Campaign Scheduler

**File:** `services/comms-service/src/campaigns/campaigns.scheduler.ts`

Currently polls every minute via `@Cron`. Replace with Azure Service Bus scheduled messages:

When creating a campaign with `scheduledAt`, instead of storing it in the DB for polling, enqueue a scheduled message:
```typescript
const sender = client.createSender('campaign-dispatch')
await sender.scheduleMessages(
  { body: { campaignId: campaign.id }, contentType: 'application/json' },
  new Date(campaign.scheduledAt),
)
```

Then subscribe to `campaign-dispatch` in `app.module.ts` and call `this.campaignsService.dispatch(msg.body.campaignId)`.

---

## Step 6 — Webhook Handling for Delivery Events

Add a webhook endpoint to receive delivery status updates from your chosen provider:

```typescript
// POST /v1/webhooks/email
@Post('webhooks/email')
@SkipTenant()
async emailWebhook(@Body() payload: unknown) {
  // Parse provider-specific payload (Azure Event Grid or Resend webhook)
  // Call: this.messageLog.updateEngagement(externalId, { delivered, openedAt, etc. })
}
```

Register the endpoint URL in Azure Communication Services or Resend dashboard.

---

## Environment Variables Summary

| Variable | Used by | Required for |
|---|---|---|
| `AZURE_SERVICE_BUS_CONNECTION_STRING` | All publishers + comms-service | Step 1 & 2 |
| `AZURE_COMMUNICATION_CONNECTION_STRING` | comms-service | Email + SMS (Azure) |
| `EMAIL_FROM_ADDRESS` | comms-service | Email delivery |
| `EMAIL_FROM_NAME` | comms-service | Email delivery |
| `RESEND_API_KEY` | comms-service | Email (Resend alternative) |
| `SMS_FROM_NUMBER` | comms-service | SMS delivery |
| `TWILIO_ACCOUNT_SID` | comms-service | SMS (Twilio alternative) |
| `TWILIO_AUTH_TOKEN` | comms-service | SMS (Twilio alternative) |
| `TWILIO_FROM_NUMBER` | comms-service | SMS (Twilio alternative) |

All are already declared (commented out) in `services/comms-service/.env` and in `src/config/configuration.ts`.

---

## What Does NOT Change

- `NotificationsService` — event → template mapping stays the same
- `TemplatesService` — template resolution and variable interpolation stays the same
- `SendRulesService` — suppression, consent, guardian routing stays the same
- `MessageLogRepository` — logging and engagement tracking stays the same
- `CampaignsService.dispatch()` — per-recipient resolution and send logic stays the same
- Admin portal — no changes needed; it reads from MessageLog and manages templates/campaigns via REST
- Database schema — no changes to `comms` schema

The pilot-to-production migration is a surface swap of transport (HTTP → Service Bus) and delivery (stub → real provider). The business logic is untouched.
