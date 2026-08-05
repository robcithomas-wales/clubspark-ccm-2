-- Give the tenant registry a home region.
--
-- `admin.organisations` is the authoritative tenant registry (see
-- docs/architecture/data-classification.md). Routing has to answer "which region
-- holds this tenant's data?" before it knows which region to talk to, so the
-- answer lives here.
--
-- NOT NULL with a default, and deliberately NOT reusing the existing `region`
-- column. That one is nullable, free-text, NULL on every row, and used only as
-- an optional filter on the internal organisations list — it carries no
-- semantics. Overloading an ambiguous filter field with a legal boundary is how
-- residency incidents happen. The two are kept separate:
--
--   region       — descriptive, optional, e.g. a sport's governing region
--   home_region  — where this tenant's data is legally required to live
--
-- Every existing tenant is in eu-west-2 today, which is why backfilling with a
-- default is safe. Once there is a second region, new tenants must have this set
-- explicitly at creation; the default stays only so the column can be NOT NULL.
ALTER TABLE admin.organisations
  ADD COLUMN IF NOT EXISTS home_region TEXT NOT NULL DEFAULT 'eu-west-2';

COMMENT ON COLUMN admin.organisations.home_region IS
  'Region whose silo holds this tenant''s data. A request reaching a different region is refused (403). Distinct from "region", which is a descriptive filter with no enforcement.';

-- Queried on every tenant->region resolution once routing exists.
CREATE INDEX IF NOT EXISTS idx_organisations_home_region
  ON admin.organisations (home_region);
