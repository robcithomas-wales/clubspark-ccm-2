-- Replace the global UNIQUE (key) constraint with a partial unique index
-- that only enforces uniqueness among system templates (tenant_id IS NULL).
-- This allows tenant-specific overrides to share a key with a system template.

ALTER TABLE comms.templates DROP CONSTRAINT templates_key_key;

CREATE UNIQUE INDEX templates_system_key_unique
  ON comms.templates (key)
  WHERE tenant_id IS NULL;
