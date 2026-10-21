-- Issue #91: storage foundation only. No ingestion API, approval, or execution is enabled.
-- Apply only after separate owner-reviewed migration authorization.
CREATE TABLE IF NOT EXISTS team_release_evidence_events (
 id TEXT PRIMARY KEY NOT NULL,
 requirement_key TEXT NOT NULL CHECK(requirement_key IN (
  'ci','merged-main','deployed-worker','d1-migrations','authenticated-owner',
  'authenticated-executor','real-read-adapter','approved-write-adapter',
  'durable-recovery','persona-e2e','monitoring','rollback','owner-signoff'
 )),
 issuer TEXT NOT NULL CHECK(length(issuer) BETWEEN 3 AND 128),
 source_family TEXT NOT NULL CHECK(length(source_family) BETWEEN 3 AND 64),
 artifact_ref TEXT NOT NULL CHECK(length(artifact_ref) BETWEEN 8 AND 1024),
 artifact_sha256 TEXT NOT NULL CHECK(length(artifact_sha256)=64 AND artifact_sha256 NOT GLOB '*[^0-9a-f]*'),
 environment TEXT NOT NULL CHECK(environment IN ('staging','production')),
 deployment_commit TEXT NOT NULL CHECK(length(deployment_commit)=40 AND deployment_commit NOT GLOB '*[^0-9a-f]*'),
 verification_method TEXT NOT NULL CHECK(length(verification_method) BETWEEN 8 AND 128),
 verdict TEXT NOT NULL CHECK(verdict IN ('verified','rejected','revoked')),
 supersedes_event_id TEXT REFERENCES team_release_evidence_events(id),
 event_time TEXT NOT NULL,
 recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS team_release_evidence_by_requirement ON team_release_evidence_events(requirement_key,recorded_at);
CREATE UNIQUE INDEX IF NOT EXISTS team_release_evidence_unique_artifact ON team_release_evidence_events(requirement_key,artifact_sha256,verdict);
CREATE TRIGGER IF NOT EXISTS team_release_evidence_no_update BEFORE UPDATE ON team_release_evidence_events BEGIN SELECT RAISE(ABORT,'release_evidence_immutable'); END;
CREATE TRIGGER IF NOT EXISTS team_release_evidence_no_delete BEFORE DELETE ON team_release_evidence_events BEGIN SELECT RAISE(ABORT,'release_evidence_immutable'); END;

CREATE TRIGGER IF NOT EXISTS team_release_evidence_supersession_guard BEFORE INSERT ON team_release_evidence_events
WHEN NEW.supersedes_event_id IS NOT NULL
BEGIN
 SELECT RAISE(ABORT,'invalid_release_evidence_supersession')
 WHERE NEW.verdict NOT IN ('revoked','rejected')
 OR NOT EXISTS (
  SELECT 1 FROM team_release_evidence_events prior
  WHERE prior.id=NEW.supersedes_event_id
   AND prior.requirement_key=NEW.requirement_key
   AND prior.environment=NEW.environment
   AND prior.deployment_commit=NEW.deployment_commit
   AND prior.verdict='verified'
 );
END;
