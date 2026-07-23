-- Entitlement service initial migration
-- Creates the entitlements schema: plans, features, org subscriptions, add-ons, overrides.
-- Plans and features are seeded separately (prisma/seed.ts).

CREATE SCHEMA IF NOT EXISTS entitlements;

-- ── Plan catalog ──────────────────────────────────────────────────────────────
CREATE TABLE entitlements.plans (
  id                      TEXT        PRIMARY KEY,
  name                    TEXT        NOT NULL,
  price_monthly           NUMERIC(10,2),
  price_annually          NUMERIC(10,2),
  transaction_fee_percent NUMERIC(5,2),
  included_sites          INTEGER     NOT NULL DEFAULT 0,
  is_custom               BOOLEAN     NOT NULL DEFAULT false,
  sort_order              INTEGER     NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Feature catalog ───────────────────────────────────────────────────────────
CREATE TABLE entitlements.features (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Plan ↔ Feature ────────────────────────────────────────────────────────────
CREATE TABLE entitlements.plan_features (
  plan_id    TEXT NOT NULL REFERENCES entitlements.plans(id)    ON DELETE CASCADE,
  feature_id TEXT NOT NULL REFERENCES entitlements.features(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, feature_id)
);

-- ── Org subscriptions ─────────────────────────────────────────────────────────
CREATE TABLE entitlements.org_subscriptions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       TEXT        NOT NULL UNIQUE,
  tenant_id             UUID        NOT NULL,
  plan_id               TEXT        NOT NULL REFERENCES entitlements.plans(id),
  billing_cycle         TEXT        NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  status                TEXT        NOT NULL DEFAULT 'active'  CHECK (status IN ('active', 'trial', 'past_due', 'cancelled')),
  trial_ends_at         TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  maxio_subscription_id TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_subscriptions_tenant ON entitlements.org_subscriptions (tenant_id);

-- ── Org plan overrides ────────────────────────────────────────────────────────
CREATE TABLE entitlements.org_plan_overrides (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id          TEXT        NOT NULL UNIQUE,
  tenant_id                UUID        NOT NULL,
  price_override           NUMERIC(10,2),
  transaction_fee_override NUMERIC(5,2),
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_plan_overrides_tenant ON entitlements.org_plan_overrides (tenant_id);

-- ── Add-on catalog ────────────────────────────────────────────────────────────
CREATE TABLE entitlements.add_ons (
  id         TEXT        PRIMARY KEY,
  name       TEXT        NOT NULL,
  price      NUMERIC(10,2) NOT NULL,
  interval   TEXT        NOT NULL CHECK (interval IN ('monthly', 'yearly')),
  feature_id TEXT        REFERENCES entitlements.features(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Org ↔ Add-on ──────────────────────────────────────────────────────────────
CREATE TABLE entitlements.org_add_ons (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id    TEXT        NOT NULL,
  tenant_id          UUID        NOT NULL,
  add_on_id          TEXT        NOT NULL REFERENCES entitlements.add_ons(id),
  status             TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  maxio_component_id TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_add_ons UNIQUE (organisation_id, add_on_id)
);

CREATE INDEX idx_org_add_ons_tenant ON entitlements.org_add_ons (tenant_id);

-- ── Seed: Plans ───────────────────────────────────────────────────────────────
INSERT INTO entitlements.plans (id, name, price_monthly, price_annually, transaction_fee_percent, included_sites, is_custom, sort_order) VALUES
  ('core',       'Core',       0,    0,    2.00, 0, false, 1),
  ('growth',     'Growth',     49,   490,  1.50, 0, false, 2),
  ('pro',        'Pro',        149,  1490, 1.00, 2, false, 3),
  ('enterprise', 'Enterprise', NULL, NULL, NULL, 0, true,  4);

-- ── Seed: Features ────────────────────────────────────────────────────────────
INSERT INTO entitlements.features (id, name, description) VALUES
  ('system_of_record',   'System of Record',         'Core data management: bookings, members, payments'),
  ('booking',            'Booking',                  'Court and facility booking'),
  ('membership',         'Membership',               'Member management and subscriptions'),
  ('payments_online',    'Online Payments',           'Accept payments online'),
  ('payments_offline',   'Offline Payments',          'Accept cash / manual payments'),
  ('team_management',    'Team Management',           'Create and manage teams'),
  ('website_basic',      'Website (Basic)',           'Single-site customer-facing website'),
  ('website_growth',     'Website (Growth)',          'Enhanced templates, team pages, multi-sport'),
  ('website_pro',        'Website (Pro)',             'Multi-site aggregation and pro templates'),
  ('multisport',         'Multi-Sport',               'Support for multiple sports within one org'),
  ('multisite',          'Multi-Site',                'Manage multiple venues under one org'),
  ('advanced_payments',  'Advanced Payments',         'Invoicing and pay-on-account'),
  ('reporting_basic',    'Reporting (Basic)',         'Standard reports and dashboard'),
  ('reporting_advanced', 'Reporting (Advanced)',      'Advanced analytics and custom reports'),
  ('integrations',       'Integrations / API',        'Third-party integrations and API access'),
  ('comms_basic',        'Comms (Basic)',             'Essential notifications'),
  ('comms_standard',     'Comms (Standard)',          'Email campaigns and automated messages'),
  ('comms_advanced',     'Comms (Advanced)',          'Full communications suite'),
  ('branded_app',        'Branded App',               'White-label mobile app'),
  ('ai_insights',        'AI Insights',               'AI-powered analytics and recommendations'),
  ('smart_access',       'Smart Access',              'Automated access control integration'),
  ('custom_domain',      'Custom Domain',             'Use your own domain for the customer portal');

-- ── Seed: Plan ↔ Feature mappings ─────────────────────────────────────────────

-- Core
INSERT INTO entitlements.plan_features (plan_id, feature_id) VALUES
  ('core', 'system_of_record'),
  ('core', 'booking'),
  ('core', 'membership'),
  ('core', 'payments_online'),
  ('core', 'website_basic'),
  ('core', 'reporting_basic'),
  ('core', 'comms_basic');

-- Growth (includes all Core features)
INSERT INTO entitlements.plan_features (plan_id, feature_id) VALUES
  ('growth', 'system_of_record'),
  ('growth', 'booking'),
  ('growth', 'membership'),
  ('growth', 'payments_online'),
  ('growth', 'payments_offline'),
  ('growth', 'team_management'),
  ('growth', 'website_basic'),
  ('growth', 'website_growth'),
  ('growth', 'multisport'),
  ('growth', 'advanced_payments'),
  ('growth', 'reporting_basic'),
  ('growth', 'comms_basic'),
  ('growth', 'comms_standard');

-- Pro (includes all Growth features)
INSERT INTO entitlements.plan_features (plan_id, feature_id) VALUES
  ('pro', 'system_of_record'),
  ('pro', 'booking'),
  ('pro', 'membership'),
  ('pro', 'payments_online'),
  ('pro', 'payments_offline'),
  ('pro', 'team_management'),
  ('pro', 'website_basic'),
  ('pro', 'website_growth'),
  ('pro', 'website_pro'),
  ('pro', 'multisport'),
  ('pro', 'multisite'),
  ('pro', 'advanced_payments'),
  ('pro', 'reporting_basic'),
  ('pro', 'reporting_advanced'),
  ('pro', 'integrations'),
  ('pro', 'comms_basic'),
  ('pro', 'comms_standard'),
  ('pro', 'comms_advanced');

-- Enterprise (all features)
INSERT INTO entitlements.plan_features (plan_id, feature_id) VALUES
  ('enterprise', 'system_of_record'),
  ('enterprise', 'booking'),
  ('enterprise', 'membership'),
  ('enterprise', 'payments_online'),
  ('enterprise', 'payments_offline'),
  ('enterprise', 'team_management'),
  ('enterprise', 'website_basic'),
  ('enterprise', 'website_growth'),
  ('enterprise', 'website_pro'),
  ('enterprise', 'multisport'),
  ('enterprise', 'multisite'),
  ('enterprise', 'advanced_payments'),
  ('enterprise', 'reporting_basic'),
  ('enterprise', 'reporting_advanced'),
  ('enterprise', 'integrations'),
  ('enterprise', 'comms_basic'),
  ('enterprise', 'comms_standard'),
  ('enterprise', 'comms_advanced'),
  ('enterprise', 'branded_app'),
  ('enterprise', 'ai_insights'),
  ('enterprise', 'smart_access'),
  ('enterprise', 'custom_domain');

-- ── Seed: Add-ons ─────────────────────────────────────────────────────────────
INSERT INTO entitlements.add_ons (id, name, price, interval, feature_id) VALUES
  ('branded_app',     'Branded App',      588,  'yearly',  'branded_app'),
  ('ai_insights',     'AI Insights',      360,  'yearly',  'ai_insights'),
  ('integrations',    'Integrations/API', 360,  'yearly',  'integrations'),
  ('smart_access',    'Smart Access',     120,  'yearly',  'smart_access'),
  ('custom_domain',   'Custom Domain',    125,  'yearly',  'custom_domain'),
  ('additional_site', 'Additional Site',  10,   'monthly', 'multisite');
