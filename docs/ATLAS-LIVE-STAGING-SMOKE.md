# ATLAS live staging smoke test

Run only against the current Vercel Preview URL. This smoke test creates one synthetic task, rejects it, verifies the audit events, and confirms a repeated decision is rejected. It never calls a model-execution endpoint. The task and audit records are intentionally retained as test evidence.

## Required environment

- `ATLAS_PREVIEW_URL`: current `*.vercel.app` preview deployment URL (not a production alias).
- `TEAM_ADMIN_TOKEN`: Preview-only operator token configured in Vercel.
- The read-only health check must report connected/schema-ready staging database; no extra staging-tests flag is required by the script.
- `TEAM_MODEL_EXECUTION_ENABLED` must remain unset or false.

## Run locally

From the repository root, set the two secret-bearing environment values in your shell, then run:

```sh
npm run staging:smoke
```

Do not commit the token, place it in a URL, or paste it into an issue. The script prints only the synthetic task ID and pass/fail evidence; it does not print credentials or connection details.

## Safety gates

The script first verifies `GET /api/health`, then probes the authenticated `GET /api/tasks` before attempting any task write. The script exits before any task write unless `GET /api/health` reports `environment=preview`, `productionOperational=false`, model execution disabled, and the staging database connected with all required tables. It then creates a low-priority synthetic task, rejects it, checks read-back and audit events, and confirms duplicate decisions return HTTP 409. It never approves the task or executes it.

The test is a manual live smoke test. CI's mock-backed tests do not count as proof that the live API-to-Neon workflow passed. Do not promote PR #147 or alter protected certification tasks based solely on this test.

## Protected Preview and operator-token troubleshooting

A Vercel SSO redirect (often HTTP 302) is deployment protection, not an ATLAS operator-token failure. Use the authenticated Vercel CLI `vercel curl` to verify the health endpoint. If it returns HTTP 200 for `/api/health` but HTTP 401 for `/api/tasks` with the operator bearer header, Vercel protection was passed and the **Preview TEAM_ADMIN_TOKEN value** is not matching the caller's token. Correct the value without logging or copying secrets into GitHub. Changing a Preview environment variable requires a **new Preview deployment from this integration branch**; redeploying `main` does not update the integration Preview. Never disable Vercel deployment protection, and never allow model execution merely to make the smoke test pass.

## Vercel-authenticated CLI mode (protected previews)

For a Vercel Preview protected by SSO, use `npm run staging:smoke:vercel` instead of the direct HTTP variant. The CLI must already be logged in (`npx vercel@65.2.0 login`). First synchronize the Preview-only `TEAM_ADMIN_TOKEN` in Vercel with the private operator token in your own Mac Keychain and redeploy the **integration** branch. HTTP 401 from authenticated `GET /api/tasks` means the tokens still do not match. Do not weaken API authorization to make a test pass.

On macOS, from the Team checkout, use the Keychain entry without printing it:

```sh
cd "$HOME/Team"
git pull --ff-only
export ATLAS_PREVIEW_URL="https://<correct-integration-preview>.vercel.app"
export TEAM_ADMIN_TOKEN="$(security find-generic-password -a "$USER" -s atlas-team-preview-admin-token -w)"
npm run staging:smoke:vercel
unset TEAM_ADMIN_TOKEN
```

The smoke script stops before creating a task if either read-only health or authenticated task-list checks fail. It runs the create/reject/audit sequence **only after** both checks pass. The CLI currently supplies the bearer header as a process argument, which can briefly be visible to local process-list tools. Run only on a trusted local Mac account; do not share terminal traces containing arguments. Never run this workflow through GitHub Actions or pull requests with real operator secrets.
