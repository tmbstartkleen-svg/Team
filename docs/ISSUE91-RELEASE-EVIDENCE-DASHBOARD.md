# Issue #91: release evidence command center (review build)

The GET-only `/api/release-evidence-dashboard` endpoint summarizes the current *read-only* launch checks and five remaining owner-controlled certification milestones. The endpoint emits only safe booleans, counts, and missing evidence identifiers.

## Intentional fail-closed constraints

- All 13 release evidence requirements begin **unverified** in this endpoint until a future trusted, audited evidence store is implemented and independently certified. There is no API request field for submitting evidence, approval, or a certification grant.
- `cert-github-read-20261019-v2` is **not approved, executed, or changed** by this build.
- Neither a passing GitHub Action nor a configured provider is an authenticated proof of multi-persona execution.
- This endpoint can never toggle executor flags, mutate D1, issue a tool call, or authorize release.
- `launchAuthorized` requires both a separately certified release evidence assessment and an operational launch signal. A completed checklist alone is not launch authority.
- Production log details, tokens, actor identities, and task contents are never returned.

## Five milestones

1. Owner-authorized and receipted GitHub repository read.
2. Separately owner-authorized and receipted GitHub write.
3. Dependent multi-persona task execution with durable receipts.
4. Monitoring, rollback, D1 schema, identity, and recovery verification.
5. Explicit owner signoff.

## Verification

Run `npm test`. The tests cover default blocker counts, invalid evidence, fail-closed runtime signals, read-only HTTP behavior, and blocked POST writes.

This review build is independent of pending PRs #141 and #142 and must not be misreported as production certification.
