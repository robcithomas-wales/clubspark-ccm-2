-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "payment";

-- CreateEnum
CREATE TYPE "payment"."ChargeRunStatus" AS ENUM ('draft', 'sent', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "payment"."PaymentStatus" AS ENUM ('pending', 'requires_action', 'processing', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "payment"."RefundStatus" AS ENUM ('pending', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "payment"."payment_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "gateway_ref" TEXT,
    "status" TEXT NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "attempted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment"."payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "customer_id" UUID,
    "provider_config_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'GBP',
    "gateway_ref" TEXT,
    "status" "payment"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "failure_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment"."provider_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'GBP',
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "credentials" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment"."refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "amount" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'GBP',
    "gateway_ref" TEXT,
    "reason" TEXT,
    "status" "payment"."RefundStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment"."webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_config_id" UUID,
    "provider" TEXT NOT NULL,
    "gateway_event_id" TEXT,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMPTZ(6),
    "error" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_attempts_payment_id_idx" ON "payment"."payment_attempts"("payment_id" ASC);

-- CreateIndex
CREATE INDEX "payments_gateway_ref_idx" ON "payment"."payments"("gateway_ref" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payment"."payments"("idempotency_key" ASC);

-- CreateIndex
CREATE INDEX "payments_tenant_id_customer_id_idx" ON "payment"."payments"("tenant_id" ASC, "customer_id" ASC);

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payment"."payments"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "payments_tenant_id_status_idx" ON "payment"."payments"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "payments_tenant_id_subject_type_subject_id_idx" ON "payment"."payments"("tenant_id" ASC, "subject_type" ASC, "subject_id" ASC);

-- CreateIndex
CREATE INDEX "provider_configs_tenant_id_is_active_idx" ON "payment"."provider_configs"("tenant_id" ASC, "is_active" ASC);

-- CreateIndex
CREATE INDEX "provider_configs_tenant_id_is_default_idx" ON "payment"."provider_configs"("tenant_id" ASC, "is_default" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "provider_configs_tenant_id_provider_currency_key" ON "payment"."provider_configs"("tenant_id" ASC, "provider" ASC, "currency" ASC);

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "payment"."refunds"("payment_id" ASC);

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "payment"."refunds"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_gateway_event_id_key" ON "payment"."webhook_events"("gateway_event_id" ASC);

-- CreateIndex
CREATE INDEX "webhook_events_provider_config_id_idx" ON "payment"."webhook_events"("provider_config_id" ASC);

-- CreateIndex
CREATE INDEX "webhook_events_provider_event_type_idx" ON "payment"."webhook_events"("provider" ASC, "event_type" ASC);

-- AddForeignKey
ALTER TABLE "payment"."payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"."payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment"."payments" ADD CONSTRAINT "payments_provider_config_id_fkey" FOREIGN KEY ("provider_config_id") REFERENCES "payment"."provider_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment"."refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"."payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment"."webhook_events" ADD CONSTRAINT "webhook_events_provider_config_id_fkey" FOREIGN KEY ("provider_config_id") REFERENCES "payment"."provider_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

