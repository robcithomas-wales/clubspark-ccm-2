-- Admin service initial migration
-- Creates the admin schema and admin_users table for portal RBAC.
-- user_id is TEXT (not UUID) so it can hold any auth provider subject —
-- Supabase UUIDs today, Azure object IDs when we migrate.

CREATE SCHEMA IF NOT EXISTS admin;

CREATE TABLE admin.admin_users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL,
  role       TEXT        NOT NULL CHECK (role IN ('super', 'bookings', 'membership', 'website', 'coaching', 'reports')),
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_admin_users_user_tenant UNIQUE (user_id, tenant_id)
);

CREATE INDEX idx_admin_users_tenant  ON admin.admin_users (tenant_id);
CREATE INDEX idx_admin_users_user    ON admin.admin_users (user_id);
