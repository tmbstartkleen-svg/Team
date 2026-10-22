# ATLAS Release — Trusted provenance acceptance contract

Status: **draft / read-only design**. This document does not authorize merges, execution, migration, or general agent release.

## Certification source matrix

| Evidence | Required provenance | Not sufficient |
| --- | --- | --- |
| Owner approval | Authenticated owner identity, signed or append-only audit event, scoped task/step, approval timestamp before reservation/execution | team_tasks.owner_approved, caller boolean |
| Durable execution receipt | Task/step/idempotency scope, independently retrievable receipt, persisted outcome, confirmed ledger, provider identity | response JSON, tool output, model assertion |
| Replay denial | Independently observed second attempted reservation, explicit denied/not-safe-to-replay outcome, original idempotency key, time and immutable record | manually asserting denied:true |
| GitHub read/write | Independent GitHub API artifact check, exact approved capability and target, matching D1/DO state | green CI workflow |
| Multi-persona | Independently recorded dependency chain across two or more personas; each relevant operation separately verified | persona count claim |
| Owner signoff | Separate owner-authenticated signoff after previous requirements pass | evidence ingestion or CI success |

## Required security invariants
1. Owner-authenticated evidence issuer identity must be authenticated by the verifier, not imported from any user-supplied `sourceVerified` flag.
2. Every task, step, receipt and idempotency identifier must match across separate trusted sources; cross-task and cross-environment linkage must fail closed.
3. Approval must predate reservation and external execution. Unknown timestamps, mismatched clocks, or absent audit trail block certification.
4. Replay rejection must be observed in a safe controlled certification process; never retry quarantined ambiguous operations. The existing protected tasks must not be approved, replayed or executed.
5. `cert-github-read-20261018` remains `needs-reconciliation` without receipt, quarantined. `cert-github-read-20261019-v2` remains unapproved and unexecuted.
6. Source outage, duplicate records, invalid digest, missing migration, truncated history or revoked proof yield zero verified evidence for affected release.
7. Evidence readers are GET/read-only and never grant execution permissions or alter agent release settings. No credentials, task details, or raw receipts in public response.
8. Rollback, recovery, production logs and owner signoff require separately witnessed verification; passing unit tests alone cannot certify them.

## Work needed before authorization request
- Implement immutable, authenticated owner-approval audit and safe replay-denial observation with secure retention; include independent verification adapters and negative security cases.
- Correlate Durable Object inspection with D1 receipt and scoped provider artifact using authenticated read-only interfaces.
- Complete production smoke tests with opt-in verification disabled until sources exist, and validate empty/malformed stores block release.
- Document deployment commit, Cloudflare version, migration rollback/recovery plan, observability privacy and retained evidence.
- Review PR #146 and #147 together before merge. Merge/deploy and D1 migration require explicit separate owner authorization.
- Require new separate explicit approval for any future certification; normal `n` continuations are not approval.

## Exit criteria for Major Build 1
The source-verification code must authenticate each evidence issuer independently, correlate all five attestation checks, satisfy end-to-end negative tests without task execution, and remain fail-closed if any source is unavailable. Until these criteria are satisfied, Build 1 is **incomplete**.
