-- Apply after 0003_task_leases.sql to dedicated TEAM D1.
ALTER TABLE team_tasks ADD COLUMN blocker_reason TEXT;
ALTER TABLE team_tasks ADD COLUMN blocker_updated_at TEXT;
CREATE INDEX IF NOT EXISTS idx_team_blockers ON team_tasks(state,blocker_updated_at);
