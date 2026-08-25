-- Booking-owned read models for Venue and Coaching hot-path data.
-- Additive and unused until explicitly backfilled and enabled.

CREATE TABLE booking.venue_resource_projection (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  venue_id uuid NOT NULL,
  group_id uuid,
  has_lighting boolean,
  is_active boolean NOT NULL,
  source_updated_at timestamptz,
  projected_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_resource_projection_pkey PRIMARY KEY (tenant_id, id)
);

CREATE INDEX venue_resource_projection_tenant_venue_idx
  ON booking.venue_resource_projection (tenant_id, venue_id);

CREATE TABLE booking.bookable_unit_projection (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  venue_id uuid NOT NULL,
  resource_id uuid NOT NULL,
  name text NOT NULL,
  unit_type text NOT NULL,
  is_active boolean NOT NULL,
  source_updated_at timestamptz,
  projected_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookable_unit_projection_pkey PRIMARY KEY (tenant_id, id)
);

CREATE INDEX bookable_unit_projection_tenant_venue_idx
  ON booking.bookable_unit_projection (tenant_id, venue_id);
CREATE INDEX bookable_unit_projection_tenant_resource_idx
  ON booking.bookable_unit_projection (tenant_id, resource_id);

CREATE TABLE booking.unit_conflict_projection (
  tenant_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  conflicting_unit_id uuid NOT NULL,
  projected_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unit_conflict_projection_pkey
    PRIMARY KEY (tenant_id, unit_id, conflicting_unit_id),
  CONSTRAINT unit_conflict_projection_canonical_check CHECK (unit_id < conflicting_unit_id)
);

CREATE INDEX unit_conflict_projection_reverse_idx
  ON booking.unit_conflict_projection (tenant_id, conflicting_unit_id);

CREATE TABLE booking.coaching_occupancy_projection (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  bookable_unit_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL,
  source_updated_at timestamptz NOT NULL,
  projected_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coaching_occupancy_projection_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT coaching_occupancy_projection_time_check CHECK (ends_at > starts_at)
);

CREATE INDEX coaching_occupancy_lookup_idx
  ON booking.coaching_occupancy_projection
  (tenant_id, bookable_unit_id, starts_at, ends_at);

CREATE TABLE booking.projection_event_receipts (
  tenant_id uuid NOT NULL,
  event_id uuid NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projection_event_receipts_pkey PRIMARY KEY (tenant_id, event_id)
);

CREATE INDEX projection_event_receipt_processed_idx
  ON booking.projection_event_receipts (tenant_id, processed_at);

CREATE TABLE booking.projection_entity_cursors (
  tenant_id uuid NOT NULL,
  source text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  source_updated_at timestamptz NOT NULL,
  deleted boolean NOT NULL DEFAULT false,
  projected_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projection_entity_cursors_pkey
    PRIMARY KEY (tenant_id, source, entity_type, entity_id)
);

CREATE INDEX projection_entity_cursor_source_idx
  ON booking.projection_entity_cursors (tenant_id, source, projected_at);
