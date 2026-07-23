-- Create integration schema
CREATE SCHEMA IF NOT EXISTS "integration";

-- CreateEnum
CREATE TYPE "integration"."WebhookDeliveryStatus" AS ENUM ('pending', 'delivered', 'failed', 'dead');

-- CreateTable: integration.api_keys
CREATE TABLE "integration"."api_keys" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"   UUID NOT NULL,
    "name"        TEXT NOT NULL,
    "key_hash"    TEXT NOT NULL,
    "scopes"      TEXT[] NOT NULL DEFAULT '{}',
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deleted_at"  TIMESTAMPTZ,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable: integration.api_key_usage
CREATE TABLE "integration"."api_key_usage" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "api_key_id"    UUID NOT NULL,
    "endpoint"      TEXT NOT NULL,
    "response_code" INTEGER NOT NULL,
    "timestamp"     TIMESTAMPTZ NOT NULL,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "api_key_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: integration.webhook_subscriptions
CREATE TABLE "integration"."webhook_subscriptions" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"     UUID NOT NULL,
    "name"          TEXT NOT NULL,
    "event_types"   TEXT[] NOT NULL DEFAULT '{}',
    "endpoint_url"  TEXT NOT NULL,
    "secret_hash"   TEXT NOT NULL,
    "is_active"     BOOLEAN NOT NULL DEFAULT true,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: integration.webhook_deliveries
CREATE TABLE "integration"."webhook_deliveries" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscription_id" UUID NOT NULL,
    "event_type"      TEXT NOT NULL,
    "payload"         JSONB NOT NULL,
    "status"          "integration"."WebhookDeliveryStatus" NOT NULL DEFAULT 'pending',
    "attempts"        INTEGER NOT NULL DEFAULT 0,
    "next_retry_at"   TIMESTAMPTZ,
    "response_code"   INTEGER,
    "response_body"   TEXT,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "integration"."api_key_usage"
    ADD CONSTRAINT "api_key_usage_api_key_id_fkey"
    FOREIGN KEY ("api_key_id") REFERENCES "integration"."api_keys"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration"."webhook_deliveries"
    ADD CONSTRAINT "webhook_deliveries_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "integration"."webhook_subscriptions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "integration"."api_keys"("key_hash");
CREATE INDEX "api_keys_tenant_id_idx" ON "integration"."api_keys"("tenant_id");
CREATE INDEX "api_keys_key_hash_idx" ON "integration"."api_keys"("key_hash");
CREATE INDEX "api_key_usage_api_key_id_timestamp_idx" ON "integration"."api_key_usage"("api_key_id", "timestamp");
CREATE INDEX "webhook_subscriptions_tenant_id_is_active_idx" ON "integration"."webhook_subscriptions"("tenant_id", "is_active");
CREATE INDEX "webhook_deliveries_status_next_retry_at_idx" ON "integration"."webhook_deliveries"("status", "next_retry_at");

-- Trigger to auto-update updated_at on api_keys
CREATE OR REPLACE FUNCTION integration.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_keys_updated_at BEFORE UPDATE ON integration.api_keys
    FOR EACH ROW EXECUTE FUNCTION integration.set_updated_at();

CREATE TRIGGER webhook_subscriptions_updated_at BEFORE UPDATE ON integration.webhook_subscriptions
    FOR EACH ROW EXECUTE FUNCTION integration.set_updated_at();

CREATE TRIGGER webhook_deliveries_updated_at BEFORE UPDATE ON integration.webhook_deliveries
    FOR EACH ROW EXECUTE FUNCTION integration.set_updated_at();
