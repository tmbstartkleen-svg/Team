# ATLAS journal persistence: staging integration package

This bundle provides a *database adapter and migration*, not a deployed persistence service. The schema is intentionally separate from current `team_tasks`, `team_events` and protected approval records.

## Safety

The migration `db/workflow-journal-migration.sql` is **review-only** and must only be applied to an independently verified isolated staging database with explicit schema-change authorization. CI never applies it. There is no new Vercel endpoint, no autonomous runner, no approval mutation and no Production operation.

The adapter uses parameterized SQL, an explicit transaction, row-level locks on existing workflows, optimistic version checking and unique-key conflict detection on initial creation. Hash-linked journals provide consistency checks, not cryptographically trusted external audit proof. Readers validate event replay; no agent or model is invoked.

A caller must supply an expected version for every write, and only the existing simulation event types are accepted. Replayed identical idempotency keys do not advance the journal. This preliminary adapter has no user authentication or tenant partitioning by itself and must not be exposed directly to end users.

## Remaining integration

Security review; isolate and authorize staging migration; integration test with real PostgreSQL under concurrent writes; add tenant/identity authorization; retention and audit policies; then separately approve any authenticated Preview API integration. Model execution and Production approval remain disabled.
