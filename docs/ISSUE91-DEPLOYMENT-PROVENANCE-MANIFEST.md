# Issue #91 — Deployment provenance manifest contract (draft)
Status: DESIGN ONLY. Not a deployment attestation, not an approval, and not authorization to merge, migrate, deploy or execute.

## Why
GitHub CI passing and an observed Cloudflare Worker version do not independently prove that reviewed source code was deployed. A branch-head equality check is also not proof of deployment. Build provenance and runtime deployment identity must be correlated using independent provider evidence.

## Proposed immutable manifest fields
- `schema_version`: versioned format (initial `1`)
- `repository`: exact GitHub repository `tmbstartkleen-svg/Team`
- `source_commit`: full 40-digit Git commit SHA, pinned at build time
- `source_ref`: `refs/heads/main`; require independently confirmed commit lineage
- `github_workflow_run_id`, `github_workflow_run_attempt`, `github_workflow_url`: trusted build identity
- `artifact_sha256`: SHA-256 of the exact deployed Worker bundle, independently reproducible
- `cloudflare_account_scope`: account identifier held in trusted configuration, never supplied as public authority
- `worker_name`: exact `atlas-team`
- `worker_version_id`: Cloudflare version UUID
- `deployment_id`: Cloudflare deployment UUID
- `environment`: `production`
- `deployment_observed_at`: UTC ISO 8601 timestamp from provider evidence
- `deployed_percentage`: traffic allocation read from Cloudflare; only claim full rollout at 100%
- `manifest_digest`: SHA-256 of deterministic canonical manifest fields, excluding signature
- `issuer`, `signature`, `key_id`: independent trusted signer identity and cryptographic binding of canonical manifest
- `verification_record_id`: independently stored durable verification evidence reference

## Verification rules
1. Fetch the GitHub workflow and commit from GitHub independently; reject unsuccessful workflows, wrong repository, untrusted branch, and commit mismatch.
2. Fetch Cloudflare deployment and Worker version using separately scoped read-only credentials. Match Worker name, version, deployment ID, percentage and production environment.
3. Verify the actual bundle's digest from trusted build output and independently retrievable deploy artifact. A self-reported SHA or deployment annotation alone is insufficient.
4. Verify the manifest signature with a pinned trusted public key, key-revocation status and trustworthy event chronology.
5. Fail closed for partial responses, unavailable sources, stale or future-dated evidence, a changed deployment, or mismatched source/bundle IDs. A new deployment requires a new manifest and re-verification.
6. Keep provenance evidence distinct from owner-approved execution certification: even a valid production manifest **cannot approve a task, certify a write, or activate agents**.

## Live observation for context only (2026-10-22)
Cloudflare read-only API observed latest `atlas-team` deployment `6d8e6f82-f1f0-4ba8-a8b7-38e1c383b155`, Worker version `04c3bdb1-d07e-4893-98a1-2eaccd6614a1` (version number 518), 100% traffic, last deployed 2026-10-21T18:35:42Z. No independently verified Git commit relationship was available. **This is NOT a completed manifest**.

## Authorization restrictions
Preserve `cert-github-read-20261018` in `needs-reconciliation`; never replay or reset it. Preserve `cert-github-read-20261019-v2` unapproved and unexecuted. General executor remains disabled. Any production signer, deployment, migration, approval or certification run requires separate, explicit owner authorization.
