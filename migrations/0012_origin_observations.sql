-- Draft only; migration requires separate owner approval.
-- Store independent upstream signed observations without modifying them.
CREATE TABLE IF NOT EXISTS team_origin_observations (
 event_id TEXT PRIMARY KEY NOT NULL,
 source_id TEXT NOT NULL,
 issuer TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('owner-authenticated-approval','observed-replay-denial')),
 task_id TEXT NOT NULL,
 step_id TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 event_json TEXT NOT NULL CHECK(length(event_json) BETWEEN 32 AND 4096),
 signature TEXT NOT NULL CHECK(length(signature)=86 AND signature NOT GLOB '*[^A-Za-z0-9_-]*'),
 recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(source_id,kind,task_id,step_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS team_origin_observations_scope ON team_origin_observations(kind,task_id,step_id,idempotency_key);
CREATE TRIGGER IF NOT EXISTS team_origin_observations_immutable_update BEFORE UPDATE ON team_origin_observations BEGIN SELECT RAISE(ABORT,'origin_immutable'); END;
CREATE TRIGGER IF NOT EXISTS team_origin_observations_immutable_delete BEFORE DELETE ON team_origin_observations BEGIN SELECT RAISE(ABORT,'origin_immutable'); END;
