# ATLAS release gate matrix — evidence classifications

This is a review checklist, not release authorization. Green CI validates only the test scope it executed.

| Gate | Evidence source | Current verified observation | Not established |
| --- | --- | --- | --- |
| Application CI | GitHub Actions #827 | Passed | production readiness |
| Disposable PostgreSQL | GitHub Actions #827, isolated service container | Schema provision and integration test passed | independently deployed staging |
| Deployed staging | separately authorized staging run | No verified receipt recorded here | deployment binding, credentials, isolation |
| Owner-authorized read adapter | signed, task-specific provider receipt | Unverified | actual approved GitHub tool invocation |
| Owner-authorized write adapter | step-scoped write and immutable receipt | Unverified | approval, execution, replay denial |
| Multi-persona dependency chain | owner assignment through provider result and UI | Unverified | operational agents |
| Production signoff | owner approval, monitoring, rollback receipt | Unverified | production launch |

## Required controls
- Cert task `cert-github-read-20261019-v2` remains unapproved and unexecuted.
- Historical `cert-github-read-20261018` remains `needs-reconciliation` with no silent replay.
- Never infer owner approval from CI status, preflight, database rows or user-supplied evidence.
- No migration 0010–0012, executor activation, production deploy or operational flag changes without separately reviewed authorization.
- Staging verification must retain environment, commit SHA, job/run reference, verifier identity and redacted receipts; never expose secrets.
- Issue #91 remains BLOCKED until every acceptance criterion is independently evidenced.
