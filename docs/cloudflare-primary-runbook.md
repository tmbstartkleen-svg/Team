# TEAM Cloudflare primary deployment runbook

This project is separate from EdgeForce and SafeGuard. Never reuse their Cloudflare D1 databases, tokens or account secrets.

## 1. Credentials
Set GitHub Actions secrets `CLOUDFLARE_API_TOKEN` (limited to Workers Scripts editing for this account) and `CLOUDFLARE_ACCOUNT_ID`. Never commit either value.

## 2. Dedicated D1 database
Create a new D1 database for TEAM (suggested name `atlas-team-data`). Review and apply `migrations/0001_team_core.sql` to the new database using Wrangler. Add the resulting database ID as the `TEAM_DB` binding in wrangler.toml only after creation. Do not use an ID from another project.

## 3. Security prerequisites
Current Cloudflare endpoints are planning/readiness only. Do not expose persisted tasks, message histories, or owner-private messages until server-side identity, authorization, and audit enforcement exist. The schema is a preparation step, NOT live persistence.

## 4. Publish and verify
Run `Deploy TEAM to Cloudflare` via GitHub Actions; confirm the deploy step ran, and check `/__team/health` plus `/api/health`. Current Vercel backend remains temporary. Do not call a green code test a successful deployment.

## 5. Launch gates
Require an authenticated owner, persistent task state, live agent runtime with approvals, owner-private messages, data retention/delete controls, and end-to-end tests before calling TEAM production-ready.
