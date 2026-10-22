# Issue 91 — Trusted source onboarding and production readiness

Status: DRAFT. No live evidence signer, ingestion endpoint, certification execution, merge, or migration is authorized.

## Release evidence source readiness

The implemented signed provenance verifier only validates signatures after it receives events. A trustworthy production source still requires an authenticated event producer, key custody, append-only durable records, independent retrieval, timestamp and task correlation, audit monitoring and key rotation. Until all these prerequisites have been deployed and independently tested, **do not configure a source or enable evidence verification**.

### Deployment prerequisites
- Approval source: authenticated owner approval event recorded at approval time with task, step, immutable event ID and timestamp. Never recreate it later from `owner_approved=1`.
- Replay source: observe a safe duplicate reservation rejection during an explicitly authorized new certification; do not replay ambiguous or historical protected tasks.
- Durable receipt source: correlate scoped D1 and Durable Object records with independent provider evidence; a confirmed flag alone is insufficient.
- Signer: separate security principal, private key outside repository/logs, public key pinned server-side, signed canonical messages, rotation/revocation procedure.
- Fail closed on signature failure, source unavailability, stale commit, missing chronology, clock uncertainty, incomplete revocation history, or incomplete migration.
- Prove no user request can provide a verifier or override source settings, and public release status remains blocked when sources are absent.

## Operator approval gates
1. Approve review/merge of draft design and integration PRs separately.
2. Approve production deployment separately from D1 migration.
3. Apply migration in controlled maintenance with recovery and rollback checks.
4. Approve only newly scoped read/write certification tasks explicitly; the two protected task IDs stay untouched.
5. Perform monitored, owner-reviewed reliability checks and final owner signoff.

## Current verified state
The draft branch CI is green, but cryptographic tests use generated test keys and fixture events. Production signer and independent audit data are not present. No operational milestones may be marked certified.

## Major Build 1 completion definition
Trusted production event sources exist, the independent verifier checks their authentic artifacts and chronology, read-only inspection works with deployed storage, and end-to-end negative tests pass. Before this, Major Build 1 remains **incomplete**.
