# ATLAS migration readiness (read-only)

This file documents the fail-closed `npm run audit:migration` check, which reads `docs/migration-readiness.json`. It is an **offline decision-support check**, not a connection to GitHub, Vercel, Cloudflare, D1, or the Safeguard sensor. It cannot authenticate evidence, approve any owner task, deploy code, rotate credentials, copy files, or delete a repository.

## Rules
- Every required gate begins `unknown` or `blocked`. The initial preview-build gate is explicitly blocked by the observed Vercel provisioning failure.
- All gates must be marked `verified` with written evidence and a nonempty, authorized destination repo before the tool can return `readyForCutover: true`. This does **not** constitute an owner deployment approval by itself; written evidence must be independently inspected.
- The `mayDeleteSource` response is always `false`. Deleting Team or Safeguard requires a separate, explicit owner-approved retirement and validated backup.
- Running the check while any gate is unknown or blocked exits with status 2. A failed readiness gate is an **expected** result until prerequisites are met; do not treat it as a production test failure.
- `npm test` exercises missing-check denial, malformed statuses, absent evidence, destination requirements, and continued source preservation after all checks appear verified.

## Required gates
1. Preserve and compare all repository branch/tag/history refs.
2. Verify the ownership of the authorized destination.
3. Build an isolated, non-production preview.
4. Pass authenticated read-only API smoke tests.
5. Prove owner-auth negative and denial tests.
6. Verify intact Safeguard case/evidence history.
7. Restore databases from tested backups.
8. Preserve the Mac sensor heartbeat and recovery.
9. Re-authorize and rotate environment credentials via secure provider UI.
10. Rehearse the domain cutover and reversal plan.
11. Obtain separate explicit owner approval for actual cutover.

## Current restrictions
- No new GitHub identity or Vercel team is connected as a destination.
- Existing Vercel previews report `Resource provisioning failed` without readable build-log events. Quota exhaustion is not established.
- Owner-held certification task `cert-github-read-20261019-v2` must remain **unapproved and unexecuted**.
- All three existing PRs (#170, Safeguard #84, and #171) must remain draft until release gate review.
- Do not store secret values or security evidence payloads in the manifest. Evidence should be opaque approved issue / CI / operation references.

## Running locally
```sh
npm test
npm run audit:migration
```
The second command intentionally exits 2 in the currently blocked state. It only reports readiness, never performs migration.
