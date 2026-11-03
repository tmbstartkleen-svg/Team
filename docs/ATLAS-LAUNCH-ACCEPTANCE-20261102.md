# ATLAS launch candidate - staged acceptance tests (2026-11-02)

**Status: NOT RELEASE CERTIFIED.** This checklist is an executable test plan, not a claim that any live test has passed. It does not authorize production promotion, owner-grant creation, protected certification execution, Mac access, migrations or Safeguard retirement.

## Test order and exit criteria

### Stage A - code and isolation (safe now)
- [ ] On PR #170 head, record the exact full commit SHA; run `npm ci` and `npm run check`. Capture actual exit codes and test summary.
- [ ] Verify seven specialists include `cybersecurity-lead` and each has domain-specific instructions that reach approved inference adapters. Test unsupported assignments fail closed.
- [ ] Negative-test owner settings and automation policy: forged JSON, expired grants, target mismatches, revoked grants, untrusted source, repeated idempotency key, and implicit scheduler activation must fail.
- [ ] Verify proposed learning requires persisted owner consent, source provenance and revocation; never use private messages, secrets or model output as self-validating evidence.
- [ ] Run code and secret hygiene audits; inspect changes for accidental credentials and irreversible operations.
- [ ] Verify PR #170, Safeguard #84 and cleanup #171 stay draft. Keep `cert-github-read-20261019-v2` queued, unapproved and unexecuted.

**Pass A:** exact-head CI green and logs retained; reviewers confirm no unapproved side effects. Passing unit tests does NOT certify deployed capabilities.

### Stage B - read-only staging (requires staging access)
- [ ] Identify deployed Cloudflare and Vercel preview SHAs, environment and binding names. Reject stale-SHA smoke tests.
- [ ] Read-only health, D1 schema, service status and release-evidence checks; missing/unsigned/revoked evidence must show BLOCKED, never PASS.
- [ ] Read-only Safeguard feed: independent scoped credentials, denied unauthenticated request, forbidden redirects, no-store responses, sanitized metadata, verified integrity provenance, and no sensor pairing-key reuse.
- [ ] Verify Mac sensor heartbeat and device identity remain unchanged before and after reads.
- [ ] Verify Vercel preview provisioning/build success and intended diagnostic rewrites. If `Resource provisioning failed` persists, mark preview BLOCKED with provider evidence; do not blame source or silently bypass.
- [ ] Record GitHub Actions usage and Vercel/Cloudflare usage before any additional builds. Limit CI churn.

**Pass B:** all reads verified against pinned deployment revisions with source-backed evidence and no writes.

### Stage C - isolated owner-approved write tests (NOT authorized by this checklist)
- [ ] Verify authenticated, server-side persisted, scoped, revocable and expiring grants. Never trust model-supplied `trustedSource`.
- [ ] Use only synthetic non-production tasks and accounts; require explicit per-test owner approval and precise target.
- [ ] Test reserve -> action -> immutable receipt; concurrent duplicate requests execute at most once; ambiguous outcomes are quarantined, never automatically replayed.
- [ ] Test pause, emergency stop, privilege denial, scheduler disabled-by-default, maximum run/expense ceilings, and manual cancellation.
- [ ] Test provider email draft (no send by default), explicitly authorized send, safe browser task, and local Mac read/write boundaries separately.
- [ ] Run a completely offline coding task with the actual installed local model; record version, performance, and filesystem boundaries.
- [ ] Test recovery, rollback, audit export, restore and Safeguard continuity.

**Pass C:** actual backend and external tool receipts reviewed; all adverse cases fail closed.

### Stage D - release decision (separate authorization)
- [ ] Independent review of PR #170, Safeguard #84, and any dependent PRs, merges and database migration plans.
- [ ] All launch gates independently evidenced; source commit, provider configurations, costs, and owner roles pinned.
- [ ] Owner separately approves staging promotion and then production rollout, with tested rollback and on-call stop controls.
- [ ] Safeguard remains independent until migration parity, history/evidence restore and sensor continuity are certified AND the owner separately signs off on retirement.

**Pass D:** owner-issued release authorization backed by verified evidence. Absent any evidence, status stays BLOCKED.

## Launch smoke scenarios
1. Ask MBA specialist for a sourced business calculation; reject fabricated citations.
2. Ask Sports Guru for fresh price/injury comparison; stale or missing feeds must be surfaced, never imaginary simulations.
3. Ask AL to assess text; output probabilistic indicators, never categorical AI-authorship proof.
4. Ask FSQA and Regional Sanitation to draft an SOP; safety critical execution requires facility validation.
5. Ask Coding Lead for an offline source change; prove no network and no outside-root writes.
6. Ask Cybersecurity Lead for approved defensive triage; preserve immutable alert evidence and reject unscoped intrusive scanning.
7. Attempt to approve a queued certification task as an unauthenticated caller; the task must remain unapproved and unexecuted.
8. Disconnect every model provider and the Safeguard feed; app must show unavailable, not fabricated success.
9. Trigger simulated upstream 401, 429 and timeout; observe bounded retries and safe degraded UI.
10. Revoke a grant while an action is pending; ensure execution cannot proceed without revalidation.

## Evidence record per gate
Capture: gate ID, exact repo/head SHA, target environment and deployment revision, time, operator, command/HTTP method, sanitized request metadata, exit/result, negative-test results, linked CI/provider logs, reviewer and disposition (PASS / BLOCKED / FAIL / NOT RUN). Never paste tokens, secrets, pairing credentials, user emails or sensitive payloads into issues.

## Current disposition
- Code foundations exist on draft PR #170; exact-head CI and independent review still required.
- Safeguard feed is not certified live; independent source PR #84 is draft.
- Vercel preview provisioning failures are unresolved.
- No production release, database migration, local Mac permissions escalation, live tool-action automation or protected certification approval is authorized here.
