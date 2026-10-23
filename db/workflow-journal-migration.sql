-- REVIEW ONLY: isolated staging migration; not applied by CI or setup-database.
-- No changes to existing task, approval or event tables.
CREATE TABLE IF NOT EXISTS atlas_workflow_journals (
 workflow_id varchar(20) PRIMARY KEY CHECK (workflow_id ~ '^[a-f0-9]{20}$'),
 version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
 journal jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE atlas_workflow_journals IS 'Non-executable planning journal snapshots; approvals cannot be granted through this table.';
REVOKE ALL ON atlas_workflow_journals FROM PUBLIC;
