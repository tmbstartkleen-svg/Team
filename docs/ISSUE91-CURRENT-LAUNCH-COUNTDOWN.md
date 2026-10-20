# ATLAS Team — current release evidence and owner-controlled gates

Updated 2026-10-20. Evidence must not be mistaken for permission to activate agents.

## Verified non-execution checks
- PR #136 CI: https://github.com/tmbstartkleen-svg/Team/actions/runs/39432811083 — passed
- PR #136 Cloudflare deployment: https://github.com/tmbstartkleen-svg/Team/actions/runs/39432811093 — passed
- Production readiness smoke: https://github.com/tmbstartkleen-svg/Team/actions/runs/39432979605 — passed
- D1 recovery readiness: https://github.com/tmbstartkleen-svg/Team/actions/runs/39432979135 — passed
- Safety regression PRs #128–#136 are merged. Their passing tests **do not establish live persona-to-tool execution**.
- GitHub Reader Preflight: https://github.com/tmbstartkleen-svg/Team/actions/runs/39329078109 — verified repository read connectivity only, **not an approved execution receipt**.

## Active hold / never silently release
- Existing task: `cert-github-read-20261019-v2`, created in a queued and unapproved state. Owner explicitly instructed that it **must remain unapproved and unexecuted**.
- Do not grant a tool step, run one-shot certification, deploy general executor flags, or infer approval from a short continuation message.
- Previous attempt `cert-github-read-20261018` has durable `needs-reconciliation` status; preserve the record and do not replay/reset it.
- The active certification's use of D1 for owner approval/grant and Durable Object for the separate certification ledger must not be conflated. A passing D1 readiness workflow is not a confirmed certification receipt.

## Five outstanding launch milestones (strict countdown)
1. **5 → 4: Owner-authorized GitHub read certification.** Blocked by explicit owner hold. Require fresh explicit approval, narrowly scoped persisted grant, exact task-only invocation, durable receipt and replay denial. No action until approved.
2. **4 → 3: Separately owner-authorized GitHub write-comment certification.** Require least-privilege credential, safe target, independent approval and durable receipt; no silent replay.
3. **3 → 2: Multi-persona end-to-end execution.** Verify dependencies, durable handoff, failure blocking, recovery, audited UI receipt.
4. **2 → 1: Production security/reliability certification.** Verify monitoring, rollback, quotas, audit correctness, failure modes and incident recovery on the deployed system.
5. **1 → 0: Final owner signoff and production launch.** Explicit owner decision required; enable no general executor in advance.

## Truthful operational reporting
- Countdown stays at **5** until a *complete* milestone's acceptance evidence is reviewed.
- A new PR, green test, green deploy or smoke result is *progress*, not a decrement.
- Do not claim the system has working autonomous personas or offline AI unless demonstrated independently.
- Cloudflare Worker `atlas-team` with TEAM D1 and a certification Durable Object is the primary currently tracked path; older release-gate documents describe legacy PostgreSQL/Vercel assumptions and must not be relied on as proof of current deployment.
- Keep owner tokens out of issue comments, build logs, and artifacts.
