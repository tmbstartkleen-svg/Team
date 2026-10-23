# ATLAS live staging smoke test

Run only against the current Vercel Preview URL. This smoke test creates one synthetic task, rejects it, verifies the audit events, and confirms a repeated decision is rejected. It never calls a model-execution endpoint. The task and audit records are intentionally retained as test evidence.

## Required environment

- `ATLAS_PREVIEW_URL`: current `*.vercel.app` preview deployment URL (not a production alias).
- `TEAM_ADMIN_TOKEN`: Preview-only operator token configured in Vercel.
- `TEAM_STAGING_TESTS_ENABLED=true` and the read-only health check must report connected/schema-ready staging database.
- `TEAM_MODEL_EXECUTION_ENABLED` must remain unset or false.

## Run locally

From the repository root, set the two secret-bearing environment values in your shell, then run:

```sh
npm run staging:smoke
```

Do not commit the token, place it in a URL, or paste it into an issue. The script prints only the synthetic task ID and pass/fail evidence; it does not print credentials or connection details.

## Safety gates

The script exits before any task write unless `GET /api/health` reports `environment=preview`, `productionOperational=false`, model execution disabled, and the staging database connected with all required tables. It then creates a low-priority synthetic task, rejects it, checks read-back and audit events, and confirms duplicate decisions return HTTP 409. It never approves the task or executes it.

The test is a manual live smoke test. CI's mock-backed tests do not count as proof that the live API-to-Neon workflow passed. Do not promote PR #147 or alter protected certification tasks based solely on this test.
