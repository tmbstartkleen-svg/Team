# ATLAS journal staging-only PostgreSQL verification

Status: **preparation only; not a production release gate pass**.

## Required approvals and scope

Before running, the owner must separately authorize writes to an **isolated staging PostgreSQL database**. Do not use any production DSN, copy of production data, administrator role with production access, or shared production resources. Never approve, execute, or replay either GitHub certification task as part of these tests.

Migration `db/workflow-journal-migration.sql` must have been separately reviewed and applied **only to the isolated staging database**. The test does not apply migrations.

## Explicit test configuration

- `ATLAS_JOURNAL_STAGING_TEST=I_AUTHORIZE_STAGING_WRITES`
- `ATLAS_JOURNAL_STAGING_DATABASE_URL`: isolated staging PostgreSQL DSN; supply through a secret manager, never commit it.
- `ATLAS_JOURNAL_STAGING_EXPECTED_DATABASE`: exact database name with `staging` in the name (for example `atlas_staging_journal`). The test compares this against PostgreSQL `current_database()` before issuing writes.

Run the single file with `node --test tests/workflow-journal-postgres-staging.test.mjs`. A missing opt-in or identity value **skips** the real-database test; a skipped test is not a successful staging certification. Review the test's outcome and confirm the test actually ran.

## What the test probes

1. Concurrent creation: one successful insertion; competing insertion rejects.
2. Concurrent same-version updates: exactly one succeeds; the other conflicts.
3. Explicit rollback restores the original version.
4. A separate connection reads the committed, replayable journal.
5. A generated workflow ID isolates the test row; cleanup attempts to delete that row.

## Important limitations and evidence

Database-name checks are safeguards, **not** proof that the hostname, identity, tenant, and privileges are staging-only. Independently verify the connection target and least-privilege grants before providing the opt-in. The suite does not currently prove network interruption behavior, process crash recovery, tenant authorization, owner grants, or actual autonomous agent execution. Store redacted evidence of test run ID, UTC timestamp, commit SHA, isolated database identity, expected-versus-observed result, reviewer, and cleanup status. Never store DSNs, tokens, or unredacted logs in the issue/PR.

Issue #91 remains BLOCKED until its separate operational acceptance criteria and owner signoff are met. This test never authorizes a production migration, public endpoint, executor activation, protected task execution, PR merge, or deployment.
