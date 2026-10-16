-- Append-only execution receipts. Requires migration 0001 and complements 0006.
CREATE TABLE IF NOT EXISTS team_execution_receipts (
 id TEXT PRIMARY KEY,
 task_id TEXT NOT NULL REFERENCES team_tasks(id),
 attempt_count INTEGER NOT NULL CHECK(attempt_count>=1),
 outcome TEXT NOT NULL CHECK(outcome IN ('verified','blocked','failed')),
 evidence TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_team_execution_receipts_task ON team_execution_receipts(task_id,created_at);
CREATE TRIGGER IF NOT EXISTS team_execution_receipts_no_update BEFORE UPDATE ON team_execution_receipts BEGIN SELECT RAISE(ABORT,'execution_receipt_immutable'); END;
CREATE TRIGGER IF NOT EXISTS team_execution_receipts_no_delete BEFORE DELETE ON team_execution_receipts BEGIN SELECT RAISE(ABORT,'execution_receipt_immutable'); END;
