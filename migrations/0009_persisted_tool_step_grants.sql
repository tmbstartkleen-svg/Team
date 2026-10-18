-- Trusted grants are provisioned only through an owner-authenticated administrative path.
-- No public endpoint may accept or mint these rows.
CREATE TABLE IF NOT EXISTS team_tool_step_grants (
 task_id TEXT NOT NULL REFERENCES team_tasks(id),
 step_id TEXT NOT NULL,
 persona TEXT NOT NULL,
 tool TEXT NOT NULL,
 capability TEXT NOT NULL CHECK(capability IN ('read','write','publish','send','delete','purchase')),
 target_json TEXT NOT NULL,
 idempotency_key TEXT NOT NULL UNIQUE,
 confirmation INTEGER NOT NULL DEFAULT 0 CHECK(confirmation IN (0,1)),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(task_id,step_id)
);
CREATE INDEX IF NOT EXISTS idx_team_tool_step_grants_enabled ON team_tool_step_grants(task_id,enabled);
