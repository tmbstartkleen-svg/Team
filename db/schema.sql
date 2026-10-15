-- Apply explicitly to a dedicated TEAM database before enabling TEAM_DATABASE_URL.
CREATE TABLE IF NOT EXISTS team_projects (
 id uuid PRIMARY KEY,
 name varchar(120) NOT NULL,
 status varchar(32) NOT NULL DEFAULT 'planned',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS team_tasks (
 id uuid PRIMARY KEY,
 project_id uuid REFERENCES team_projects(id),
 title varchar(240) NOT NULL,
 persona varchar(100) NOT NULL,
 priority varchar(16) NOT NULL DEFAULT 'medium',
 status varchar(32) NOT NULL DEFAULT 'queued',
 approval varchar(32) NOT NULL DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now(),
 approved_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS team_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 task_id uuid,
 event_type varchar(64) NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team_tasks_created_idx ON team_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS team_events_task_idx ON team_events(task_id,created_at DESC);
