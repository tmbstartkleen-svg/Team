# ATLAS Staging Certification Ledger — 2026-10-23

**Scope:** Draft PR #147 and the isolated Vercel Preview/Neon staging branch only. This ledger is documentary evidence, **not** a production release certificate and not a machine-verified attestation of this or later commits.

## Observed staging workflow (commit ae8e51878898)

- Authenticated read-only preflight: HTTP 200; Preview, staging schema ready, model execution disabled.
- Synthetic task `abe00ce2-94ea-4cae-b0a5-1dc554a29014`: independently read from staging Neon as queued, approval rejected.
- Exactly one `task.created` and one `task.rejected` audit event were independently found for that task.
- Operator's authenticated CLI replay against the same Preview returned **HTTP 409** and `not_found_or_already_decided`. This was user-supplied terminal evidence, not independently replayed with server credentials here.
- Two earlier synthetic test tasks were left queued/pending after a superseded SQL defect; they were not approved or executed.

## Release interpretation

The staging create/reject/audit/duplicate-decision behavior has observed evidence for **ae8e51878898**. Later commits require an independent release evidence chain; they must not inherit a `liveWorkflowVerified=true` claim just because this ledger exists. Runtime `/api/health` intentionally remains `liveWorkflowVerified=false` unless trustworthy commit-specific proof is attached.

## Unfinished operational requirements

- Cloudflare edge integration is not certified.
- Autonomous agents and offline inference are not operational.
- Required production model/provider configuration and controlled execution are absent.
- Production launch and merge require explicit owner approval after independent readiness review.

Never add secrets or tokens to this ledger. Do not use it as justification to approve the protected GitHub certification tasks.
