# ATLAS staging database integration — owner review checklist

Status: PREPARATION ONLY. No database provisioning, connection, data changes, model execution, task approval, or deployment authorized here.

## Select the correct persistence layer

ATLAS currently has **two distinct schemas**:
- Vercel Node API uses PostgreSQL via `lib/database.mjs` (`TEAM_DATABASE_URL`), `db/schema.sql`, and `scripts/setup-database.mjs`.
- Cloudflare Worker uses D1/SQLite migrations in `migrations/0001_team_core.sql` onward. **Never apply D1 migrations to PostgreSQL**; they define different task columns and types.

## Provision staging separately (requires separate owner approval)

1. Create a **new empty** PostgreSQL project solely for ATLAS staging, with a separate project ID, branch, hostname, database role and restricted credentials. Do not clone an existing production branch or import production data.
2. Verify project identity with its provider API and store an immutable staging project ID separately from the connection URL. A different hostname or username **alone does not certify isolation**.
3. Restrict the staging credential to the staging database; keep production URLs and credentials out of the preview runtime. For the preview comparison preflight, use only `TEAM_PRODUCTION_DATABASE_HOST` (a non-secret hostname). Never add `TEAM_PRODUCTION_DATABASE_URL` to preview; the guard rejects it. This comparison is not independent provider attestation.
4. Review `db/schema.sql` (PostgreSQL) and approve its initial application to the dedicated empty project separately. Never run `npm run db:setup` against an existing or unknown database.
5. Set `TEAM_ADMIN_TOKEN`, `TEAM_DATABASE_URL`, `TEAM_STAGING_INSTANCE_ID`, `TEAM_PRODUCTION_DATABASE_HOST`, and `TEAM_STAGING_TESTS_ENABLED` only in the Vercel **preview** environment after the owner approves; use dedicated secrets that cannot access production.
6. Keep `OPENAI_API_KEY` and executor credentials unset during storage/authentication tests. Staging tests must never touch `cert-github-read-20261018` or `cert-github-read-20261019-v2`.

## Non-execution acceptance checklist

- Live `GET /api/health` reports `environment=preview`, `productionOperational=false`, `modelExecution=disabled`, `autonomousAgents=false`.
- Authenticated `GET /api/readiness` reports configuration only, never release certification.
- Anonymous `GET /api/tasks` and `POST /api/plan` return 401.
- Provider-verified separate project identity, staging-only role grants, and TLS validation are recorded before any task writes.
- Once separately approved, test a **new synthetic staging-only task**; verify durable creation, review, and audit records, without calling `/api/execute-approved`.
- No approval, task execution, migration, credential change, merge, or promotion is implied by passing tests.

## Known blocker

As of 2026-10-22, the Vercel preview exposes no `TEAM_DATABASE_URL` or `TEAM_ADMIN_TOKEN`. An existing connected Neon project was not verified as staging-dedicated and its branch is marked as a Vercel production branch. **Do not reuse that project.** A dedicated project has not been provisioned.
