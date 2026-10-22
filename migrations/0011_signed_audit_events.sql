-- Storage only: no signer, writer, approval, execution or public ingestion route.
-- Must not be applied without separate owner-authorized D1 migration.
CREATE TABLE IF NOT EXISTS team_signed_audit_events (
 id TEXT PRIMARY KEY NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('owner-authenticated-approval','observed-replay-denial')),
 task_id TEXT NOT NULL,
 step_id TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 issuer TEXT NOT NULL,
 event_json TEXT NOT NULL CHECK(length(event_json) BETWEEN 32 AND 4096),
 signature TEXT NOT NULL CHECK(length(signature)=86 AND signature NOT GLOB '*[^A-Za-z0-9_-]*'),
 recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(kind,task_id,step_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS team_signed_audit_scope_idx ON team_signed_audit_events(task_id,step_id,idempotency_key);
CREATE TRIGGER IF NOT EXISTS team_signed_audit_no_update BEFORE UPDATE ON team_signed_audit_events BEGIN SELECT RAISE(ABORT,'signed_audit_immutable'); END;
CREATE TRIGGER IF NOT EXISTS team_signed_audit_no_delete BEFORE DELETE ON team_signed_audit_events BEGIN SELECT RAISE(ABORT,'signed_audit_immutable'); END;
