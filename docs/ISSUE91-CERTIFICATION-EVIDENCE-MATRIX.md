# Issue #91 — Certification evidence matrix (draft, non-execution)

Status: REVIEW PREPARATION ONLY. This document grants no approval to merge, deploy, migrate, execute, replay, or activate agents. GitHub CI and connectivity preflight are not operational certification.

## Hard exclusions
- `cert-github-read-20261018`: historical `needs-reconciliation` with no verified receipt; do not retry, replay, delete or reset ledger state.
- `cert-github-read-20261019-v2`: remains queued/unapproved and unexecuted. Do not issue a grant or approve it.
- General executor remains disabled until separately authorized release conditions are fulfilled.

## Five operational milestones (none certified)

| Gate | Required independent evidence | Current blocker | Owner authorization needed |
| --- | --- | --- | --- |
| 1. Scoped GitHub READ | New task/step/idempotency identity; authenticated owner decision recorded BEFORE reservation; persisted allowlisted D1 grant; independently retrieved GitHub provider response and durable receipt; observed replay denial | Historical read lacked verified receipt. Connectivity preflight is not durable execution | Separately approve a NEW scoped task and subsequent execution; protected task IDs remain excluded |
| 2. Scoped GitHub WRITE | Distinct scoped owner approval, least-privilege write credential, exact target comment, confirmed GitHub response, durable receipt, ambiguity/replay reconciliation | No authorized production write certification | Separate express write authorization |
| 3. Dependent multi-persona workflow | Timestamped assignment, approved scope, per-step ledger records, dependency ordering, results, blocker/retry handling and dashboard receipts | No verified production workflow evidence | Approve newly scoped workflow |
| 4. Production security/reliability | Production D1 migration inventory and verified schema; signature provenance and key custody/rotation; deployment SHA correlation; observability, recovery/rollback drills and independent audit | Draft PRs #146/#147, unsigned operational source chain, migration/change window not authorized | Separate merge, deployment and migration approvals after independent review |
| 5. Owner signoff | Full evidence references, run IDs, final release readiness verdict and explicit owner acceptance | Prior four gates not certified | Explicit final acceptance |

## Read-only verification queue
1. Independently review PR #146 design and PR #147 integration scope; keep draft/unmerged until authorized.
2. Verify CI run #686 is successful for PR #147 commit `aec97a3c3f6a2663b0f8c0579f49bda85181ce03`; record this as test evidence only.
3. Inspect Cloudflare D1 migration readiness without writes; specifically migration 0008 and draft migrations 0010–0012. No migration application.
4. Review trusted provenance: private signer custody, pinned verification keys, separation of producer/observer, source signature validity, chronology and revocation completeness.
5. For every milestone record environment, full deployment commit, source origin, task/step/idempotency key (where applicable), run ID, receipt/ledger IDs, independently retrievable proof, reviewer and outcome. Missing proof means NOT CERTIFIED.

## Prohibited shortcuts
- Do not infer owner authorization from database booleans, UI status or test fixtures.
- Do not treat GitHub PR CI, successful read-only smoke, Worker API health or configured credentials as execution proof.
- Do not bypass the owner approval gate or reuse historical idempotency keys.
- Do not mark any operational milestone complete merely because this checklist exists.
