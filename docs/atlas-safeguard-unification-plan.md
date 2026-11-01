# ATLAS Unified Workforce + Safeguard migration plan

Status: **design and fail-closed policy foundation only**. Not connected to a live Mac, VPN, browser, or Safeguard sensor. No autonomous execution enabled.

## Product direction

ATLAS is the single owner-facing workspace. Safeguard becomes a **Security Operations** subsystem with its existing sensor identity, evidence, network alerts, trusted baselines, and defensive collectors preserved. The two repositories and hosted services remain separate until a tested staged migration proves parity; existing production deployments must not be silently replaced.

The old TEAM architecture document states that TEAM is an independent product. This proposal intentionally changes that *future target architecture* but does not change current deployment assumptions. Any runtime integration must use authenticated, versioned boundaries and an explicit owner-approved migration.

## Workspaces

1. **Command Center**: active specialists, human approvals, task progress, evidence and intervention.
2. **Security Operations**: Mac heartbeat, network alerts, listener/Wi-Fi inventory, findings, case history, audit timelines and trusted baselines imported from Safeguard with provenance.
3. **Privacy & VPN**: read current local VPN state; an explicit user click may request connect or disconnect through a supported, installed VPN client and signed local bridge. The dashboard itself is never a VPN service. Never imply a tunneled connection merely because the toggle is on; confirm state from the operating system and VPN client, and display failures.
4. **Local Workspace**: offline models that are actually installed, sandboxed code editing/execution, files, app launch, browser session and manual sync on reconnect.
5. **Agent Workforce**: reusable persona templates and independently scoped replicas; per-replica identity, quotas, version, audit trail, and revoke switch.
6. **Continuous Improvement**: proposed skills, model upgrades, test results, evaluation history and rollback candidates. Continuous learning means reviewed additions to memory and tooling, **not** unsupervised modification of trust policy or model weights.

## Safeguard preservation requirements

- Keep current Safeguard dashboard and sensor running in parallel during migration.
- Record source repository version, local sensor version, last verified heartbeat and backup/restore checks.
- Preserve `~/.safeguard/agent-state.json`, `~/.safeguard/sensor-config.json`, LaunchAgent `~/Library/LaunchAgents/com.startkleen.safeguard.sensor.plist`, and macOS Keychain pairings. Do not copy secrets into GitHub, chat logs, ATLAS UI or cloud migration fixtures.
- Safeguard may store sensitive private data under `.sentinel-data/` or configured `SENTINEL_DATA_DIR`; inventory and export through supported secure methods only, with retention and permission checks.
- Preserve evidence provenance, trusted baselines, alert deduplication, sensor authentication, audit events and collection authorization scopes.
- Use read-only, mutually authenticated health/alerts integration first; then dual-run validation. No unapproved remote network scanning or defensive changes.
- Support sensor re-pairing with user approval and clear rollback.

## Approval contract

**Owner approval is mandatory for every submission on the owner's behalf**, including messages, forms, GitHub writes/merges, assignments, purchases, deployments, code pushes, browser submission clicks, network configuration changes, VPN connect/disconnect requested by agents, and irreversible desktop actions.

- Agents may research, draft, test in isolated sandboxes, and queue requests within preauthorized read/local-workspace scopes.
- Before a consequential action, present precise target, action, payload/diff, credential/scope summary, estimated cost, and rollback path.
- Store a signed/verified, one-time, exact-task/capability/target/payload-hash grant in authenticated backend storage with TTL and an immutable audit receipt.
- Separate proposal, human approval, execution claim, receipt, reconciliation, and rollback states. A persona/replica cannot approve its own work or impersonate the owner.
- Re-approve on payload change, target change, expired approval, replica change, or ambiguous partial execution.
- Global emergency stop must deny all future effectful actions locally and online; fail closed offline when approval verification is unavailable.
- First implementation `lib/unified-capability-policy.mjs` **deliberately denies all effectful operations** until a real trusted grant verifier is connected; caller-supplied approval objects cannot activate anything.

## Offline boundary

A cloud Worker cannot directly run or open software on a disconnected Mac. A separately installed, explicitly authorized local ATLAS companion must perform local work, keep private durable queues and logs, and validate owner authority locally. Offline coding needs a local model runtime, suitable model files and sandbox toolchain; local browser automation can interact only with resources reachable offline. External submissions and cloud sync queue until connectivity returns and the owner approves the exact final payload.

## Implementation milestones

1. **Foundation / contracts**: policy registry, explicit deny-by-default effects, test coverage, documented migration safeguards (this PR).
2. **Read-only Safeguard adapter**: authenticated alerts, heartbeat, baselines and evidence UI, with schema validation and provenance tests. No sensor replacement yet.
3. **Local companion**: signed installation, Keychain identity migration, read-only telemetry, offline model capability discovery, secure local queue, least-privilege app/browser adapters.
4. **VPN client adapter**: supported client discovery, status, explicit owner-confirmed connect/disconnect, OS-verified state, network kill-switch status where supported. No custom VPN tunnel claims.
5. **Task executor**: sandboxed editor/test runner, agent replica identity isolation, browser/application control, deterministic approval/receipt state machine.
6. **Continuous improvement**: staged update channels, trusted signed artifacts, evaluation suites, owner-approved promotion, rollback and data retention settings.
7. **Migration certification**: both products dual-run with matched alerts, sensor availability, evidence export/import, offline recovery, network-boundary tests, owner approval and rollback signoff.

## When can the Safeguard chat be deleted?

**Not yet.** Only after (a) its required decisions, configuration and runbooks are saved outside the chat, (b) authorized Safeguard data and backups are verified, (c) ATLAS read-only SOC parity and local sensor continuity are proven, (d) recovery/rollback has been tested, and (e) the owner confirms the historical conversation is no longer needed. Deleting a chat does not delete GitHub repositories, deployed services, Keychain items or other copies. Do not uninstall Safeguard based on a chat deletion decision.

## Release boundaries

Existing Team PRs #168 and #169 and the controlled staging certification remain independent. This integration proposal does not authorize merging, deploying, modifying branch protections, triggering execution or changing Safeguard production.
