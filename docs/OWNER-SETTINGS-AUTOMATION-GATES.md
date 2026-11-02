# Owner settings and automation prelaunch gates

Status: **contract and unit tests only**; no live settings write, email send, browser control, scheduler activation or computer control is implemented by this file.

## Required end-to-end backend

1. **Trusted identity.** Authenticate owner in the backend (not in model-generated JSON or a browser flag).
2. **Scoped connection.** Resolve a registered provider tool with least-privilege permissions for the exact account and target.
3. **Persisted grant.** Retrieve revocable, expiring action-and-target grant from durable storage, checking owner identity and permission source independently.
4. **Execution reservation.** For a mutation, reserve unique idempotency key and write an execution-pending ledger entry before invoking the connector.
5. **Actual tool execution.** Run action only with verified tool adapter and bounded timeout. Never treat an AI answer as a receipt.
6. **Outcome receipt.** Persist provider request ID/result, durable status, and any indeterminate outcome; refuse automatic replay on ambiguity.
7. **Owner controls.** Show settings and scheduled tasks, permit revoke/pause, and require extra confirmation for sensitive actions.
8. **Automation lifecycle.** New schedules start disabled; only an independently verified owner grant can enable them. Enforce max runs, minimum intervals, expiry and spending quotas, plus manual emergency stop.
9. **Computer access.** Separate local agent with macOS permissions for file/browser operations; no shell/Keychain/Full Disk Access assumptions. Restrict writable roots and enforce per-app approval.
10. **Recovery.** Prove backup restore, lease locking, replay prevention and authentication-negative tests in isolated staging.

## Preflight contract only

`lib/owner-settings-automation-policy.mjs` catalogs allowed operations and exports pure gate predicates. Its `trustedSource: server-verified` field is **not cryptographic evidence**; actual backend must load records from trusted server-side persistence and never accept this field from request JSON or the model. Do not wire it directly to a public handler as if it could verify a real grant. The test suite validates intended behavior but is **not** integration certification.

## Existing work to preserve

- Owner action approvals and persistent step grants
- D1 reservation/ledger and outcome receipts
- Safe fail-closed behavior on ambiguous adapter failures
- Protected certification task `cert-github-read-20261019-v2` stays queued, unapproved, and unexecuted
- Draft integration PR #170 and independent Safeguard PR #84 remain unmerged until reviewed
