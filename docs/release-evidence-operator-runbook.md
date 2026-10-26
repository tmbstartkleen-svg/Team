# ATLAS release evidence operator runbook

## Purpose

Use this checklist to move from passing CI to independently verified release evidence. This document does not authorize task approval, execution, migration, deployment, or production release.

## Gate 1 — Review the code change

- [ ] Confirm the PR head commit is the commit whose verification run passed.
- [ ] Inspect all failed and skipped workflow steps; a skipped step is not a pass.
- [ ] Obtain an independent review before merging.
- [ ] Confirm the PR has no production deployment or database migration side effects.

## Gate 2 — Inspect isolated staging

- [ ] Confirm the staging Worker uses the pinned staging D1 database, not production D1.
- [ ] Verify staging environment flags keep general tool execution disabled and unreleased.
- [ ] Check health and schema readiness through read-only endpoints.
- [ ] Treat bundle dry runs and unit tests as code validation only, not live agent certification.

## Gate 3 — Evidence integrity

- [ ] Require evidence to identify exact environment, deployed commit/version, task fixture, issuer, expiry, and receipt references.
- [ ] Validate signatures against pinned, time-bounded issuer keys and check revocation.
- [ ] Verify D1 approval and execution receipt provenance independently.
- [ ] Reject stale deployment hashes, mismatched task IDs, replayed receipts, wrong environment/database identity, expired evidence, and missing proof.
- [ ] Keep missing evidence explicitly unverified; do not infer readiness from configuration, CI, health status, or a caller-supplied flag.

## Gate 4 — Owner-controlled certification

- [ ] Use only a dedicated disposable test task and the exact least-privilege scope authorized by the owner.
- [ ] Obtain explicit owner approval for that exact task before any execution.
- [ ] Verify the resulting state and immutable receipt independently from D1.
- [ ] Test provider failure, ambiguous receipt persistence, replay denial, recovery, and rollback without touching user tasks.
- [ ] Keep general execution disabled until the owner separately approves release activation.

## Prohibited shortcuts

- Do not approve or execute `cert-github-read-20261019-v2`.
- Do not approve or execute `cert-atlas-staging-recovery-20261026-v1` without separate explicit owner authorization.
- Do not apply evidence migrations to production as part of this checklist.
- Do not set recovery or operational flags based solely on test results.
- Do not place credentials, model output, private task contents, or secrets in logs or PR comments.

## Release decision

Record evidence references for every required gate, list remaining blockers, and request a separate owner decision. CI success, this checklist, and evidence presence do not themselves authorize production release.
