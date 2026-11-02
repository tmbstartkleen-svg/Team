# ATLAS / Safeguard repository cleanup audit — 2026-11-02

## Scope and method
Inspected the tracked file trees on the `main` branches of `tmbstartkleen-svg/Team` and `tmbstartkleen-svg/Safeguard`; reviewed selective runtime imports and active GitHub workflow configuration. This is a **static, partial reference audit**, not a complete dependency proof. Separate branches and remote deployments may depend on files not reached by simple code search.

## Inventory
- ATLAS Team main: **259** tracked blobs; **0** pairs of identical tracked Git blob SHAs.
- Safeguard main: **220** tracked blobs; **0** identical tracked Git blob SHA pairs.
- On the Team cleanup branch after document removals: **254** tracked blobs before adding the hygiene audit utility.

## Removed in cleanup PR #171 (Git history retained)
- `docs/BUILD6.md`
- `docs/BUILD15.md`
- `docs/ARCHITECTURE.md`
- `docs/production-release-gate.md`
- `docs/launch-milestones-after-90.md`

These were prior milestone snapshots, not live runtime components. The historical content is recoverable from Git.

## Retained despite appearing unused by the current runtime
| File | Static reference observations | Decision |
|---|---|---|
| `lib/inbox-routing.mjs` | Own test file only in indexed code search | Retain: future inbox ordering contract |
| `lib/microsoft-oauth.mjs` | Own test file only | Retain: consent/PKCE security-sensitive code |
| `lib/sports-team.mjs` | Own test file only | Retain: proposed persona team contract |
| `lib/deployment-probe.mjs` | Referenced by readiness script and test | Retain |
| `lib/certification-window.mjs` | Referenced by executor and preflight | Retain |
| `lib/certification-ledger-adapter.mjs` | Referenced by certification components | Retain |

Do not delete source or security-related workflows merely because import references seem sparse. First confirm imports, runtime dynamic dispatch, deployment manifests, releases, tests and rollback dependencies.

## Recommended follow-on cleanup sequence
1. Run `npm run audit:repo` to report tracked secret/build artifacts and identical content. The command reads tracked files only, produces JSON, and never deletes anything.
2. Run `node --test tests/repo-hygiene-audit.test.mjs`, `npm run check`, and the existing workflow test matrix.
3. Review open ATLAS PR #170 and Safeguard PR #84 for data parity and migration readiness.
4. After owner-approved integration and live dual-run validation, review now-redundant modules one at a time with isolated removal PRs and rollback instructions.
5. **Do not delete or archive Safeguard** before Mac sensor continuity, credential rotation, evidence integrity, backup restoration and standalone fallback are certified.

The reserved `cert-github-read-20261019-v2` task remains **queued, unapproved and unexecuted**. This audit must not change authorization, deployment or execution flags.

## Latest verification notes
- The hygiene audit now compares **staged Git index blobs**, not potentially modified working-tree contents. This prevents uncommitted local edits from changing the reported tracked snapshot.
- The CLI's entrypoint uses `pathToFileURL(resolve(process.argv[1]))` so npm / relative invocations can execute correctly.
- A top-level `coverage/` folder is treated as generated output, but a nested `app/api/.../coverage/` route is valid source.
- Three isolated Node tests passed; an isolated Git-index CLI run reported two tracked test files, no forbidden tracked file names, and no duplicates. This is **not** a full Team repository verification.
- Vercel preview inspected at deployment `dpl_MNncUSDHDhyNfgGjQdceDjWtFBDN`: status `BUILD_FAILED`, message `Resource provisioning failed`, and no build-log events available. Root cause not established; do not misattribute to the cleanup.
