-- Internal staff tooling tables: organisations, feature_flags, audit_logs, impersonation_sessions

CREATE TABLE admin.organisations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL UNIQUE,
  name              TEXT        NOT NULL,
  slug              TEXT        UNIQUE,
  sport             TEXT,
  region            TEXT,
  plan              TEXT        NOT NULL DEFAULT 'trial',
  status            TEXT        NOT NULL DEFAULT 'active',
  payment_connected BOOLEAN     NOT NULL DEFAULT false,
  onboarding_pct    INTEGER     NOT NULL DEFAULT 0,
  admin_email       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organisations_status ON admin.organisations (status);
CREATE INDEX idx_organisations_plan   ON admin.organisations (plan);
CREATE INDEX idx_organisations_region ON admin.organisations (region);

CREATE TABLE admin.feature_flags (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL,
  flag            TEXT        NOT NULL,
  enabled         BOOLEAN     NOT NULL DEFAULT false,
  override_reason TEXT,
  set_by          TEXT,
  set_by_email    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_feature_flags_tenant_flag UNIQUE (tenant_id, flag),
  CONSTRAINT fk_feature_flags_tenant FOREIGN KEY (tenant_id) REFERENCES admin.organisations (tenant_id)
);

CREATE INDEX idx_feature_flags_tenant ON admin.feature_flags (tenant_id);
CREATE INDEX idx_feature_flags_flag   ON admin.feature_flags (flag);

CREATE TABLE admin.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    TEXT        NOT NULL,
  staff_email TEXT,
  tenant_id   UUID,
  action      TEXT        NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  meta        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_staff_time  ON admin.audit_logs (staff_id, created_at DESC);
CREATE INDEX idx_audit_logs_tenant_time ON admin.audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_action      ON admin.audit_logs (action);
CREATE INDEX idx_audit_logs_time        ON admin.audit_logs (created_at DESC);

CREATE TABLE admin.impersonation_sessions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id       TEXT        NOT NULL,
  staff_email    TEXT,
  tenant_id      UUID        NOT NULL,
  target_user_id TEXT        NOT NULL,
  target_email   TEXT,
  reason         TEXT        NOT NULL,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at       TIMESTAMPTZ,
  status         TEXT        NOT NULL DEFAULT 'active',
  CONSTRAINT fk_impersonation_tenant FOREIGN KEY (tenant_id) REFERENCES admin.organisations (tenant_id)
);

CREATE INDEX idx_impersonation_staff_time ON admin.impersonation_sessions (staff_id, started_at DESC);
CREATE INDEX idx_impersonation_tenant     ON admin.impersonation_sessions (tenant_id);
CREATE INDEX idx_impersonation_status     ON admin.impersonation_sessions (status);
