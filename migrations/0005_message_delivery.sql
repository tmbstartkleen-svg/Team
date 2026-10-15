-- Apply after 0001_team_core.sql on the dedicated TEAM D1 database.
CREATE TABLE IF NOT EXISTS team_message_delivery (
 message_id TEXT PRIMARY KEY REFERENCES team_messages(id) ON DELETE CASCADE,
 state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','queued','sending','needs-reconciliation','delivered','failed')),
 attempt_count INTEGER NOT NULL DEFAULT 0,
 delivery_receipt TEXT,
 last_error TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_team_delivery_state ON team_message_delivery(state,updated_at);
