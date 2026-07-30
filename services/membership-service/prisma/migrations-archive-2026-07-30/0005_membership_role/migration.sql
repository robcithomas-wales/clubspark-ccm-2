-- Add member_role to memberships
-- Stores the role of the member within the plan (e.g. player, coach, parent, manager, admin)

ALTER TABLE membership.memberships
  ADD COLUMN IF NOT EXISTS member_role TEXT;
