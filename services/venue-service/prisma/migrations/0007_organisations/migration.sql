-- Organisation entity: one per tenant, owns org-level identity and site config
CREATE TABLE venue.organisations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL UNIQUE,
  name            TEXT        NOT NULL,
  slug            TEXT        NOT NULL UNIQUE,
  custom_domain   TEXT        UNIQUE,
  primary_colour  TEXT        NOT NULL DEFAULT '#1857E0',
  logo_url        TEXT,
  about           TEXT,
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  maps_embed_url  TEXT,
  is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX organisations_tenant_id_idx ON venue.organisations (tenant_id);
CREATE INDEX organisations_slug_idx      ON venue.organisations (slug);
