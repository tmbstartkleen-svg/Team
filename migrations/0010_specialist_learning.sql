-- Additive, owner-controlled specialist feedback. Do not run in production without owner approval.
CREATE TABLE IF NOT EXISTS team_specialist_learning (
 id TEXT NOT NULL,
 owner_id TEXT NOT NULL REFERENCES team_memory_consent(owner_id) ON DELETE CASCADE,
 specialist_id TEXT NOT NULL CHECK(specialist_id IN ('mba','sports-guru','al-detector','fsqa-manager','sanitation-regional','coding-execution','cybersecurity-lead')),
 type TEXT NOT NULL CHECK(type IN ('owner-correction','cited-source','verified-outcome','evaluation-result')),
 summary TEXT NOT NULL CHECK(length(summary) BETWEEN 5 AND 1000),
 evidence_ref TEXT NOT NULL CHECK(length(evidence_ref) BETWEEN 1 AND 128),
 state TEXT NOT NULL DEFAULT 'proposed' CHECK(state IN ('proposed','promoted','revoked')),
 base_version TEXT,
 next_version TEXT,
 evaluation_tests INTEGER,
 evaluation_regressions INTEGER,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 promoted_at TEXT,
 PRIMARY KEY(owner_id,id)
);
CREATE INDEX IF NOT EXISTS idx_team_specialist_learning_scope
 ON team_specialist_learning(owner_id,specialist_id,state,created_at);
