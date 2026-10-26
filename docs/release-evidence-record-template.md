# ATLAS release evidence record template

> This template records evidence; it does not approve tasks, certify runtime readiness, or authorize deployment. Never include secrets, private task content, or model output.

## Record identity

- Evidence record ID:
- Environment: `staging` (production evidence requires a separate owner-approved process)
- Service / Worker name:
- Deployment version:
- Source commit SHA:
- Evidence issuer identity:
- Issued at (UTC):
- Expires at (UTC):
- Revocation check source and result:
- Reviewer:

## Gate being evaluated

- Required gate ID:
- Exact test fixture / task ID (use a dedicated disposable fixture):
- Intended capability and scope:
- Owner authorization reference, if applicable:
- Expected result:
- Observed result:
- Status: `unverified` until all checks below pass

## Evidence references

- Workflow run URL and final conclusion:
- Deployed staging health/readiness receipt:
- Staging D1 database identity confirmation:
- Approval record reference (if applicable):
- Immutable execution receipt ID (if applicable):
- Recovery / replay-denial / rollback evidence references:
- Independent verification method and result:

## Integrity checks

- [ ] Evidence signature validated against a pinned trusted issuer key.
- [ ] Issuer key was valid at issuance and is not revoked.
- [ ] Environment, Worker, source commit, and deployment version match.
- [ ] Evidence is current and has not expired.
- [ ] Fixture/task IDs match across authorization, execution, and receipt.
- [ ] D1 identity and immutable receipt provenance independently verified.
- [ ] Replay, mismatch, stale-deployment, and failure paths reject as expected.
- [ ] No secrets or sensitive payloads were copied into logs or this record.

## Decision

- Verified checks:
- Missing checks:
- Known limitations:
- Independent reviewer decision:
- Owner decision reference (separate from this record):
- Follow-up issue:

**Rules:** Missing or ambiguous evidence remains `unverified`. CI success, health checks, a signature alone, or this template's completion cannot independently authorize launch. Do not change runtime flags or execute tasks to fill out this record without separate explicit owner authorization.
