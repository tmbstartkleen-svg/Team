-- Append-only owner decision audit records. Apply after 0001-0005 on dedicated TEAM D1.
CREATE TABLE IF NOT EXISTS team_approval_audit (
 id TEXT PRIMARY KEY,
 task_id TEXT NOT NULL REFERENCES team_tasks(id),
 actor TEXT NOT NULL CHECK(actor = 'owner'),
 decision TEXT NOT NULL CHECK(decision IN ('approved','rejected')),
 reason TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_team_approval_audit_task ON team_approval_audit(task_id,created_at);
CREATE TRIGGER IF NOT EXISTS team_approval_audit_no_update BEFORE UPDATE ON team_approval_audit BEGIN SELECT RAISE(ABORT,'approval_audit_immutable'); END;
CREATE TRIGGER IF NOT EXISTS team_approval_audit_no_delete BEFORE DELETE ON team_approval_audit BEGIN SELECT RAISE(ABORT,'approval_audit_immutable'); END;
