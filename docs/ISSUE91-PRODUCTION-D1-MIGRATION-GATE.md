# Production D1 migrations 0008 and 0009 — approval gate

Live read-only inventory on 2026-10-18 confirmed that `atlas-team-data` has `team_tasks` and `team_execution_receipts` but lacks `team_tool_action_ledger` and `team_tool_step_grants`.

Before modifying production:
1. Review `migrations/0008_tool_action_ledger.sql` and `migrations/0009_persisted_tool_step_grants.sql`. The SQL creates new tables and indexes; it does not backfill grants.
2. Confirm dedicated database `atlas-team-data` and take an appropriate restore point/back-up under the organization's Cloudflare policies.
3. Explicitly approve applying both migration files in that order.
4. Apply on staging first and verify `sqlite_master`, schema constraints, and test rollback procedure.
5. Apply to production only with explicit owner approval and limited credentials; verify presence and expected schema.
6. Retain `TEAM_TOOL_EXECUTOR_ENABLED` and `TEAM_TOOL_EXECUTOR_RELEASED` disabled throughout.
7. Conduct authenticated read-only end-to-end certification before contemplating release.

Do not substitute existence-only checks for full schema verification. Record Cloudflare operation IDs and resulting D1 schema evidence under Issue #91.
