-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "coaching";

-- CreateTable
CREATE TABLE "coaching"."coach_availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "coach_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "lesson_type_id" UUID,

    CONSTRAINT "coach_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaching"."coach_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "coach_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaching"."coach_lesson_types" (
    "coach_id" UUID NOT NULL,
    "lesson_type_id" UUID NOT NULL,

    CONSTRAINT "coach_lesson_types_pkey" PRIMARY KEY ("coach_id","lesson_type_id")
);

-- CreateTable
CREATE TABLE "coaching"."coaches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "specialties" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaching"."lesson_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "coach_id" UUID NOT NULL,
    "lesson_type_id" UUID NOT NULL,
    "customer_id" UUID,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "price_charged" DECIMAL(10,2),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookable_unit_id" UUID,

    CONSTRAINT "lesson_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaching"."lesson_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sport" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "max_participants" INTEGER NOT NULL DEFAULT 1,
    "price_per_session" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_availability_coach_id_day_of_week_idx" ON "coaching"."coach_availability"("coach_id" ASC, "day_of_week" ASC);

-- CreateIndex
CREATE INDEX "coach_availability_coach_id_idx" ON "coaching"."coach_availability"("coach_id" ASC);

-- CreateIndex
CREATE INDEX "coach_availability_tenant_id_idx" ON "coaching"."coach_availability"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "coach_blocks_coach_id_idx" ON "coaching"."coach_blocks"("coach_id" ASC);

-- CreateIndex
CREATE INDEX "coach_blocks_coach_id_starts_at_ends_at_idx" ON "coaching"."coach_blocks"("coach_id" ASC, "starts_at" ASC, "ends_at" ASC);

-- CreateIndex
CREATE INDEX "coach_blocks_tenant_id_idx" ON "coaching"."coach_blocks"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "coach_lesson_types_coach_id_idx" ON "coaching"."coach_lesson_types"("coach_id" ASC);

-- CreateIndex
CREATE INDEX "coach_lesson_types_lesson_type_id_idx" ON "coaching"."coach_lesson_types"("lesson_type_id" ASC);

-- CreateIndex
CREATE INDEX "coaches_customer_id_idx" ON "coaching"."coaches"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "coaches_tenant_id_idx" ON "coaching"."coaches"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "coaches_tenant_id_is_active_idx" ON "coaching"."coaches"("tenant_id" ASC, "is_active" ASC);

-- CreateIndex
CREATE INDEX "lesson_sessions_coach_id_idx" ON "coaching"."lesson_sessions"("coach_id" ASC);

-- CreateIndex
CREATE INDEX "lesson_sessions_customer_id_idx" ON "coaching"."lesson_sessions"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "lesson_sessions_lesson_type_id_idx" ON "coaching"."lesson_sessions"("lesson_type_id" ASC);

-- CreateIndex
CREATE INDEX "lesson_sessions_tenant_id_idx" ON "coaching"."lesson_sessions"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "lesson_sessions_tenant_id_starts_at_idx" ON "coaching"."lesson_sessions"("tenant_id" ASC, "starts_at" ASC);

-- CreateIndex
CREATE INDEX "lesson_sessions_tenant_id_status_idx" ON "coaching"."lesson_sessions"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "lesson_types_tenant_id_idx" ON "coaching"."lesson_types"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "lesson_types_tenant_id_is_active_idx" ON "coaching"."lesson_types"("tenant_id" ASC, "is_active" ASC);

-- CreateIndex
CREATE INDEX "lesson_types_tenant_id_sport_idx" ON "coaching"."lesson_types"("tenant_id" ASC, "sport" ASC);

-- AddForeignKey
ALTER TABLE "coaching"."coach_availability" ADD CONSTRAINT "coach_availability_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaching"."coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching"."coach_blocks" ADD CONSTRAINT "coach_blocks_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaching"."coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching"."coach_lesson_types" ADD CONSTRAINT "coach_lesson_types_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaching"."coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching"."coach_lesson_types" ADD CONSTRAINT "coach_lesson_types_lesson_type_id_fkey" FOREIGN KEY ("lesson_type_id") REFERENCES "coaching"."lesson_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching"."lesson_sessions" ADD CONSTRAINT "lesson_sessions_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaching"."coaches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching"."lesson_sessions" ADD CONSTRAINT "lesson_sessions_lesson_type_id_fkey" FOREIGN KEY ("lesson_type_id") REFERENCES "coaching"."lesson_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

