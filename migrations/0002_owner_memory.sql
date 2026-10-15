-- TEAM owner-controlled, opt-in learning data. Requires authenticated owner API before use.
CREATE TABLE IF NOT EXISTS team_memory_consent (
 owner_id TEXT PRIMARY KEY,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS team_memory_items (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES team_memory_consent(owner_id) ON DELETE CASCADE,
 category TEXT NOT NULL CHECK(category IN ('formatting','workflow','priority','routine')),
 content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 500),
 source TEXT NOT NULL DEFAULT 'owner-explicit',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_team_memory_owner ON team_memory_items(owner_id,created_at);
