-- DRAFT ONLY. Not part of auto-applied migrations. Apply only after explicit
-- owner authorization and a full ordered migration review. Staging first.
CREATE TABLE IF NOT EXISTS team_certification_evidence (
 id TEXT PRIMARY KEY NOT NULL,
 task_id TEXT NOT NULL REFERENCES team_tasks(id),
 gate TEXT NOT NULL,
 envelope_json TEXT NOT NULL,
 envelope_sha256 TEXT NOT NULL CHECK(length(envelope_sha256)=64),
 issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS team_certification_evidence_task
 ON team_certification_evidence(task_id,gate);
CREATE TRIGGER IF NOT EXISTS team_certification_evidence_no_update
 BEFORE UPDATE ON team_certification_evidence BEGIN SELECT RAISE(ABORT,'immutable_certification_evidence'); END;
CREATE TRIGGER IF NOT EXISTS team_certification_evidence_no_delete
 BEFORE DELETE ON team_certification_evidence BEGIN SELECT RAISE(ABORT,'immutable_certification_evidence'); END;
-- Revocation MUST be tracked separately; never update a signed evidence row.
CREATE TABLE IF NOT EXISTS team_certification_revocations (
 id TEXT PRIMARY KEY NOT NULL,
 evidence_id TEXT NOT NULL UNIQUE REFERENCES team_certification_evidence(id),
 reason TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER IF NOT EXISTS team_certification_revocations_no_update
 BEFORE UPDATE ON team_certification_revocations BEGIN SELECT RAISE(ABORT,'immutable_certification_revocation'); END;
CREATE TRIGGER IF NOT EXISTS team_certification_revocations_no_delete
 BEFORE DELETE ON team_certification_revocations BEGIN SELECT RAISE(ABORT,'immutable_certification_revocation'); END;
