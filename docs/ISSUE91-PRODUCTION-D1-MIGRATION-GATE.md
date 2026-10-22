# Issue #91 — Production D1 schema inventory and migration approval gates

## Verified production inventory — 2026-10-22

An authenticated **read-only Cloudflare D1 API** inspection of database `atlas-team-data` confirmed the following production tables exist:
- `team_tasks`
- `team_execution_receipts`
- `team_tool_action_ledger` (migration 0008 ledger table)
- `team_tool_step_grants` (migration 0009 grant table)

The historical inventory from **2026-10-18** reported the ledger and grants tables absent. That observation is now **superseded** by the 2026-10-22 live inspection. **Do not blindly reapply migrations 0008 or 0009.**

The read-only schema inspection additionally observed:
- Ledger: `idempotency_key` primary key, unique `receipt_id`, and `state` check limited to `reserved`, `confirmed`, `needs-reconciliation`.
- Grants: composite primary key `(task_id,step_id)`, unique idempotency key, constrained capability, `enabled INTEGER NOT NULL DEFAULT 0`, and `confirmation` flag.
- Receipts: constrained outcome, foreign key to `team_tasks`, and immutable UPDATE/DELETE blocking triggers.
- The proposed `team_release_evidence_events`, `team_signed_audit_events`, and `team_origin_observations` tables (draft migrations 0010–0012) were **not detected** in the queried production schema.

All inspected D1 calls returned `rows_written=0` and `changed_db=false`; no migration was run. These are schema observations, **not proof** of owner-approved live execution, correct historical receipts, or full end-to-end foreign-key integrity.

## Controlled next steps (no authorization granted by this document)

1. Compare the existing 0008/0009 schema with checked-in migration definitions and confirm their constraints; do not assume the migration history merely from table existence.
2. Review draft migrations 0010–0012 for provenance, append-only triggers, revocation behavior, and migration conflicts. Do not apply them without separate explicit owner authorization and a rollback plan.
3. Verify the production Worker D1 binding and deploy revision independently; keep `TEAM_TOOL_EXECUTOR_ENABLED` and `TEAM_TOOL_EXECUTOR_RELEASED` disabled.
4. Establish owner-authenticated, step-scoped approvals and independent evidence sources; don't infer authorization from legacy D1 audit rows or passing CI.
5. Preserve `cert-github-read-20261018` in its historical `needs-reconciliation` state; no replay, clearing, or retries. Preserve `cert-github-read-20261019-v2` **unapproved and unexecuted**.
6. Record source run IDs, signed evidence artifacts, reviewer, environment, and deployment SHA for each release gate. Issue #91 remains blocked until all operational acceptance criteria are met.

No PR merge, deployment, migration, grant, approval, executor activation, or task execution is authorized by this document.
