# ATLAS TEAM

ATLAS is an owner-governed AI workforce workspace, with Cloudflare as the primary edge interface and Vercel as a standby backend. The platform has local UI, planning, task-routing, server API, authorization and certification components. Individual modules do **not** prove production-ready autonomous agent execution.

## Repositories and migration status

- **ATLAS / Team (this repository):** owner workspace and orchestrator.
- **Safeguard (separate repository):** security operations platform, authenticated Mac sensor, local Keychain identity, incident/evidence history and recovery procedures. **Keep this repository and service operational.**
- **EdgeForce (separate repository):** sports intelligence. Not part of this cleanup.

ATLAS + Safeguard convergence is currently under development and review in [Team PR #170](https://github.com/tmbstartkleen-svg/Team/pull/170) and [Safeguard PR #84](https://github.com/tmbstartkleen-svg/Safeguard/pull/84). Both are drafts; this cleanup does **not** merge, deploy or authorize them.

## What is safe to do

- Run project tests locally with `npm test` (Node 20+).
- Use `index.html` as a prototype UI; offline browser-local state is not production persistence.
- Review [release gates](docs/RELEASE-GATES.md), [Cloudflare runbook](docs/cloudflare-primary-runbook.md) and [integration plan](https://github.com/tmbstartkleen-svg/Team/blob/feature/atlas-unified-workforce-security-foundation/docs/atlas-safeguard-unification-plan.md).

## Repository hygiene

Five obsolete documents (the Build 6 and Build 15 notes, superseded standalone architecture, historical Build 75 production gate, and historical Build 90 launch milestones) were removed from the proposed active tree after reference checks. The files remain recoverable from Git history. Local secrets, build outputs, test coverage, and transient logs are excluded by the updated `.gitignore`; this does not delete any existing local files. Existing migrations, CI workflows, security tests, certification records, rollback code and sensor integration requirements are intentionally preserved.

**Do not delete/archive Safeguard** until production parity, protected secret handling, data export/restore, Mac sensor continuity, offline/reconnection behavior and rollback have been independently tested and owner-approved. Removing a GitHub repository never uninstalls a Mac sensor or guarantees personal data deletion.

## Verify repository cleanliness

Run `npm run audit:repo` to inspect tracked files for generated artifacts, local secrets, and exact duplicate contents; this command never deletes or alters files. The detailed [cleanup audit](docs/REPOSITORY-CLEANUP-AUDIT.md) records retained modules and dependency risks. Run `npm run check` before proposing more removals.
