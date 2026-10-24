# ATLAS Issue #91 — evidence and execution certification ledger

Updated: 2026-10-24. This document is a release tracking record, not a signed attestation or approval.

## Verified evidence

| Gate | Evidence | Classification |
| --- | --- | --- |
| Application verification | GitHub Actions #831, commit `bc023e68a710d67f36c97ae02cd528694ea47fe2` | Passed |
| Disposable PostgreSQL | Same run; job `Isolated PostgreSQL journal integration` passed | Passed in isolated CI |
| Exact preview deployment | Vercel deployment `dpl_Crqm9TUpjWg3WDLNFnwZTrvDeWap`, commit `0f4f8ab597fc3714225303ee1b8a6c2558bfcc4d` | Ready; earlier commit than current PR head |
| Read-only preview preflight | Owner-provided terminal output, commit `0f4f8ab597fc`, status 200, taskWrites 0 | Passed as reported; owner-supplied evidence |
| Live staging smoke | Owner-provided terminal output; synthetic task `180728c0-b4d8-4c49-87e4-b5fadd4219b3` rejected, audit events observed, duplicate decision 409, model not called, production untouched | Passed as reported; owner-supplied evidence |

## Current limitations

- The live smoke evidence is for preview commit `0f4f8ab597fc`; it does not certify newer commits.
- The terminal evidence has not been independently retrieved as a signed provider attestation.
- Authenticated GitHub read-adapter execution with an independently verified provider receipt remains unverified.
- Multi-persona dependent workflow, retry/recovery, monitoring and rollback evidence, and final owner signoff remain open.
- Health reported edge integration unconfigured/uncertified and model execution/autonomous agents disabled.

## Non-negotiable restrictions

- Keep PRs #146 and #147 draft/unmerged pending independent review and required approvals.
- Keep `cert-github-read-20261019-v2` unapproved and unexecuted.
- Preserve `cert-github-read-20261018` as historical `needs-reconciliation`; never replay it automatically.
- Do not apply production migrations, change executor flags, create provider write actions, or deploy to production based on this ledger.
- A future read-adapter certification must use a new, explicitly owner-approved, narrowly scoped task, independent provider evidence, durable receipt, and replay-denial verification.
