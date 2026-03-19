CREATE TABLE IF NOT EXISTS venue.news_posts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL,
  title           TEXT        NOT NULL,
  slug            TEXT        NOT NULL,
  body            TEXT,
  cover_image_url TEXT,
  published       BOOLEAN     NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS news_posts_tenant_id_idx ON venue.news_posts (tenant_id);
CREATE INDEX IF NOT EXISTS news_posts_tenant_published_idx ON venue.news_posts (tenant_id, published);
