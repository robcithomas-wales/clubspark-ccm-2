-- CreateTable
CREATE TABLE "coaching"."programmes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sport" TEXT,
    "coach_id" UUID,
    "venue_id" UUID,
    "max_participants" INTEGER NOT NULL DEFAULT 10,
    "min_participants" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "enrolls_from" TIMESTAMP(3),
    "enrolls_until" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programmes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaching"."programme_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "coach_id" UUID,
    "bookable_unit_id" UUID,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programme_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaching"."enrolments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "order_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrolments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaching"."attendances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "programme_session_id" UUID NOT NULL,
    "enrolment_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "attended" BOOLEAN,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "programmes_tenant_id_idx" ON "coaching"."programmes"("tenant_id");

-- CreateIndex
CREATE INDEX "programmes_tenant_id_status_idx" ON "coaching"."programmes"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "programmes_tenant_id_sport_idx" ON "coaching"."programmes"("tenant_id", "sport");

-- CreateIndex
CREATE INDEX "programmes_coach_id_idx" ON "coaching"."programmes"("coach_id");

-- CreateIndex
CREATE INDEX "programme_sessions_tenant_id_idx" ON "coaching"."programme_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "programme_sessions_programme_id_idx" ON "coaching"."programme_sessions"("programme_id");

-- CreateIndex
CREATE INDEX "programme_sessions_coach_id_idx" ON "coaching"."programme_sessions"("coach_id");

-- CreateIndex
CREATE INDEX "programme_sessions_tenant_id_starts_at_idx" ON "coaching"."programme_sessions"("tenant_id", "starts_at");

-- CreateIndex
CREATE INDEX "enrolments_tenant_id_idx" ON "coaching"."enrolments"("tenant_id");

-- CreateIndex
CREATE INDEX "enrolments_programme_id_idx" ON "coaching"."enrolments"("programme_id");

-- CreateIndex
CREATE INDEX "enrolments_customer_id_idx" ON "coaching"."enrolments"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrolments_programme_id_customer_id_key" ON "coaching"."enrolments"("programme_id", "customer_id");

-- CreateIndex
CREATE INDEX "attendances_tenant_id_idx" ON "coaching"."attendances"("tenant_id");

-- CreateIndex
CREATE INDEX "attendances_programme_session_id_idx" ON "coaching"."attendances"("programme_session_id");

-- CreateIndex
CREATE INDEX "attendances_enrolment_id_idx" ON "coaching"."attendances"("enrolment_id");

-- CreateIndex
CREATE INDEX "attendances_customer_id_idx" ON "coaching"."attendances"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_programme_session_id_enrolment_id_key" ON "coaching"."attendances"("programme_session_id", "enrolment_id");

-- AddForeignKey
ALTER TABLE "coaching"."programmes" ADD CONSTRAINT "programmes_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaching"."coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching"."programme_sessions" ADD CONSTRAINT "programme_sessions_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "coaching"."programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching"."programme_sessions" ADD CONSTRAINT "programme_sessions_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaching"."coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching"."enrolments" ADD CONSTRAINT "enrolments_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "coaching"."programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching"."attendances" ADD CONSTRAINT "attendances_programme_session_id_fkey" FOREIGN KEY ("programme_session_id") REFERENCES "coaching"."programme_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching"."attendances" ADD CONSTRAINT "attendances_enrolment_id_fkey" FOREIGN KEY ("enrolment_id") REFERENCES "coaching"."enrolments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

