-- ATLAS TEAM Cloudflare D1 schema, initial migration.
-- Apply only to a dedicated TEAM database after owner review.
CREATE TABLE IF NOT EXISTS team_projects (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS team_tasks (
 id TEXT PRIMARY KEY, project_id TEXT REFERENCES team_projects(id),
 title TEXT NOT NULL, assigned_persona TEXT,
 state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','blocked','verified','failed')),
 owner_approved INTEGER NOT NULL DEFAULT 0 CHECK(owner_approved IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS team_messages (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES team_projects(id),
 task_id TEXT REFERENCES team_tasks(id), persona TEXT NOT NULL,
 visibility TEXT NOT NULL CHECK(visibility IN ('project-team','owner-private')),
 kind TEXT NOT NULL CHECK(kind IN ('update','question','handoff','blocked','owner')),
 body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_team_tasks_project ON team_tasks(project_id,state);
CREATE INDEX IF NOT EXISTS idx_team_messages_project ON team_messages(project_id,created_at);
