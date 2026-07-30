-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "commerce";

-- CreateEnum
CREATE TYPE "commerce"."OrderStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded');

-- CreateTable
CREATE TABLE "commerce"."orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "organisation_id" UUID,
    "person_id" UUID,
    "status" "commerce"."OrderStatus" NOT NULL DEFAULT 'pending',
    "currency" CHAR(3) NOT NULL DEFAULT 'GBP',
    "total_amount" INTEGER NOT NULL,
    "subject_type" TEXT,
    "subject_id" UUID,
    "idempotency_key" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_type" TEXT NOT NULL,
    "product_id" UUID,
    "description" TEXT NOT NULL,
    "unit_amount" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total_amount" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "organisation_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "product_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."prices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'GBP',
    "member_amount" DECIMAL(10,2),
    "price_type" TEXT NOT NULL DEFAULT 'standard',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "commerce"."orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "orders_tenant_id_idx" ON "commerce"."orders"("tenant_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_status_idx" ON "commerce"."orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "orders_tenant_id_person_id_idx" ON "commerce"."orders"("tenant_id", "person_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_subject_type_subject_id_idx" ON "commerce"."orders"("tenant_id", "subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_organisation_id_idx" ON "commerce"."orders"("tenant_id", "organisation_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "commerce"."order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_tenant_id_idx" ON "commerce"."order_items"("tenant_id");

-- CreateIndex
CREATE INDEX "order_items_tenant_id_product_type_product_id_idx" ON "commerce"."order_items"("tenant_id", "product_type", "product_id");

-- CreateIndex
CREATE INDEX "products_tenant_id_idx" ON "commerce"."products"("tenant_id");

-- CreateIndex
CREATE INDEX "products_tenant_id_is_active_idx" ON "commerce"."products"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "products_tenant_id_product_type_idx" ON "commerce"."products"("tenant_id", "product_type");

-- CreateIndex
CREATE INDEX "prices_product_id_idx" ON "commerce"."prices"("product_id");

-- CreateIndex
CREATE INDEX "prices_tenant_id_idx" ON "commerce"."prices"("tenant_id");

-- CreateIndex
CREATE INDEX "prices_tenant_id_is_active_idx" ON "commerce"."prices"("tenant_id", "is_active");

-- AddForeignKey
ALTER TABLE "commerce"."order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "commerce"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."prices" ADD CONSTRAINT "prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "commerce"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

