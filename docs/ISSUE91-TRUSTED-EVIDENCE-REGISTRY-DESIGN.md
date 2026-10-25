# Issue #91 — Trusted release evidence registry (design only)

Status: **proposal; no production schema or runtime behavior changed**.

## Current verified gap
`getReleaseEvidenceDashboard()` currently calls `summarizeReleaseEvidence({launch,releaseEvidence:{}})`, so all 13 requirements remain unverified. `assessTeamRelease()` accepts `{verified:true,reference}` as input but does **not** authenticate a source; do not directly map user-provided rows into that interface.

## Required trust boundary
- Use a dedicated immutable D1 append-only evidence-event table with migrations and triggers preventing UPDATE/DELETE. Restrict writes to a separately authenticated, scoped evidence-ingestion service, not public HTTP, owner input, UI flags, or model output.
- Each entry must carry requirement key, issuer/service principal, trusted source family, artifact locator, artifact digest, event time, environment, main commit/deployment identity, verification method, verdict, and revocation/supersession link.
- Only evidence verified independently against its original source is eligible. CI, deployments, schema checks, logging configuration and network connectivity prove *their own* limited scope; they must not certify agent executions, receipt durability, recovery drills or signoff.
- GitHub-read certification requires explicit task approval, exact scoped grant, trusted adapter response, durable receipt, and replay denial **for the same task**. The ambiguous `cert-github-read-20261018` record must remain quarantined; `cert-github-read-20261019-v2` must remain unapproved and unexecuted.
- Evidence-ingestion must be separated from approval/signoff operations. Require owner identity and separate approval for write-certification and release signoff. Do not let evidence ingestion set executor flags.
- Public dashboard exposes only aggregated verified counts/keys; authenticated owner inspection may display safe references and validation reasons, never tokens, request headers, unredacted logs, or raw task data.

## Verification and fail-closed behavior
1. Missing D1 binding/table/migration: verified=0, launch blocked.
2. Unknown requirement/issuer, invalid digest, untrusted source, stale environment/commit, duplicate/conflicting evidence, or expired/revoked artifact: not verified.
3. Producer success without independently retrievable, validated artifact: not verified.
4. Historical `needs-reconciliation` without receipt: remains unverified and never retried automatically.
5. Tests: forged caller evidence; malformed events; mixed trusted/untrusted records; downgrade/revocation; partial D1 outage; concurrent append attempts; no mutation through GET; no production execution enabling.
6. Production validation: apply migration in a separately approved maintenance window, verify append-only triggers, exercise negative cases, then separately authorize any live certification.

## Implementation sequence
1. Review/approve this contract and evidence issuers.
2. Introduce D1 migration + unit tests with no writer reachable from public routes.
3. Implement strictly scoped source verifiers and immutable ingestion audit.
4. Expose read-only source-backed aggregates; keep all milestones blocked until trusted records exist.
5. Run non-execution staging tests and owner-reviewed production deployment. Never infer permission to release agents from a short continuation message.
