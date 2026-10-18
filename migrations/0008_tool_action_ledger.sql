-- Durable idempotency ledger. An ambiguous or interrupted attempt is not automatically retried.
CREATE TABLE IF NOT EXISTS team_tool_action_ledger (
 idempotency_key TEXT PRIMARY KEY,
 task_id TEXT NOT NULL,
 step_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('reserved','confirmed','needs-reconciliation')),
 receipt_id TEXT UNIQUE,
 evidence TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS team_tool_action_ledger_task_idx ON team_tool_action_ledger(task_id,step_id);
