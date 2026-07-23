-- Activity timeline: stores cross-service domain events as person history
CREATE TABLE people.person_activities (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID        NOT NULL,
  person_id   UUID        NOT NULL REFERENCES people.persons(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  meta        JSONB       NOT NULL DEFAULT '{}',
  source_id   TEXT        NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_person_activities_person
  ON people.person_activities (tenant_id, person_id, occurred_at DESC);

CREATE INDEX idx_person_activities_event_type
  ON people.person_activities (tenant_id, event_type);

-- Segments: named groups of people (static or dynamic rule-based)
CREATE TABLE people.segments (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID        NOT NULL,
  name         TEXT        NOT NULL,
  description  TEXT        NULL,
  type         TEXT        NOT NULL DEFAULT 'static',
  conditions   JSONB       NOT NULL DEFAULT '[]',
  member_count INT         NOT NULL DEFAULT 0,
  last_built_at TIMESTAMPTZ NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_segments_tenant ON people.segments (tenant_id);
CREATE INDEX idx_segments_tenant_type ON people.segments (tenant_id, type);

CREATE OR REPLACE FUNCTION people.set_segments_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_segments_updated_at
  BEFORE UPDATE ON people.segments
  FOR EACH ROW EXECUTE FUNCTION people.set_segments_updated_at();

-- Segment membership: the people who belong to each segment
CREATE TABLE people.segment_memberships (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  UUID        NOT NULL,
  segment_id UUID        NOT NULL REFERENCES people.segments(id) ON DELETE CASCADE,
  person_id  UUID        NOT NULL REFERENCES people.persons(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by   TEXT        NULL,
  UNIQUE (segment_id, person_id)
);

CREATE INDEX idx_segment_memberships_segment ON people.segment_memberships (segment_id);
CREATE INDEX idx_segment_memberships_person  ON people.segment_memberships (tenant_id, person_id);
