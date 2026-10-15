-- Run on dedicated TEAM D1 after the initial core migration.
-- Enables durable leases and evidence without allowing unapproved execution.
ALTER TABLE team_tasks ADD COLUMN lease_token TEXT;
ALTER TABLE team_tasks ADD COLUMN lease_until TEXT;
ALTER TABLE team_tasks ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE team_tasks ADD COLUMN completion_evidence TEXT;
CREATE INDEX IF NOT EXISTS idx_team_claims ON team_tasks(state,owner_approved,lease_until);
