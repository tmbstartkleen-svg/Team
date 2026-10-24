# ATLAS GitHub read-adapter certification plan — draft only

Status: **test preparation; no live certification executed by this plan**.

## Scope
Validate one read-only repository identity request using a new, separately owner-approved, narrowly scoped staging task. Do not use either protected historical certification task. In particular, keep `cert-github-read-20261019-v2` unapproved and unexecuted and preserve `cert-github-read-20261018` in `needs-reconciliation`.

## Preconditions
- Reviewed code and passing CI on the exact commit to be tested.
- Independently verified staging environment and least-privilege GitHub credential restricted to the intended repository read.
- Owner approval and persisted step grant bound to the new task ID, step ID, exact capability `read`, tool `github.read`, owner/repo `tmbstartkleen-svg/Team`, and resource `repository`.
- General executor flags remain disabled; the one-shot certification route must be independently confirmed scoped to the new approved task. Do not reconfigure it to accept the protected task ID.
- Record the staging deployment ID/SHA and verifier identity before execution.

## Test sequence
1. Read back persisted grant and owner approval through the trusted backend; caller-supplied grant JSON is not acceptable.
2. Run exactly one repository GET through the allowlisted adapter. No arbitrary URL, method, redirect, or write capability.
3. Verify response identity equals the requested owner/repository and numeric repository ID is valid.
4. Independently retrieve the durable execution receipt and ledger entry; verify task ID, step ID, capability, adapter, provider outcome, timestamps, commit/environment context and digest.
5. Repeat the same task/step attempt and verify replay is denied with no second provider call or duplicate receipt.
6. Verify malformed target, wrong repository, expired/revoked grant, missing provider evidence, provider 401/403/429/5xx, oversized response and persistence failure all fail closed.
7. Confirm no repository write occurred, no model call occurred, general executor remains disabled, and all staging artifacts are reconciled.
8. Capture redacted run IDs and a reviewer decision. Never record tokens, Authorization headers or raw secret-bearing logs.

## Release rule
A passing unit test, a passing disposable PostgreSQL CI job, the earlier synthetic task rejection smoke, or a terminal summary alone does not certify this gate. Only independently verified provider evidence plus durable receipt and replay-denial proof can mark the read-adapter gate complete. Write-adapter certification, multi-persona workflows, monitoring/rollback, and production owner signoff are separate gates.
