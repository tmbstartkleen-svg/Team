# ATLAS Cybersecurity Division — Equal-priority launch capability

**Owner direction:** Safeguard, defensive cybersecurity, authorized security testing, monitoring, incident response, local Mac sensor and security governance stay **combined with ATLAS**, never deleted or downgraded during cleanup.

## System boundaries
- **Source of truth:** `tmbstartkleen-svg/Safeguard` remains an independent private repository and security service, integrated under the ATLAS dashboard. Preserve full history, pairing credentials in macOS Keychain, sensor LaunchAgent, health/heartbeat handling, evidence chain, incident logs and alert records.
- **Lead specialist:** `cybersecurity-lead` directs security tasks. ATLAS Coding & Execution Lead supports integration without taking control of Safeguard's sensor identity.
- **Capabilities:** asset inventory, configuration audit, authorized vulnerability assessment, threat triage, security event review, defensive hardening, incident-response playbooks and evidence integrity review.
- **Hacking/penetration testing:** operate only on clearly authorized systems and scopes, with bounded rate, safety checks and explicit approvals for intrusive work. No unrestricted scanning, persistence, exfiltration or destructive actions.
- **Protected integration:** use separately scoped, read-only `/api/atlas-read` metadata (Safeguard PR #84). Do not use sensor pairing keys for dashboard reads or turn `/api/monitoring/status` into a read call if it mutates state.
- **Mac boundaries:** Mac agent, filesystem, accessibility, screen/browser permissions and local security sensor are separately approved. Never assume Full Disk Access, Keychain access or unattended terminal privileges.
- **Retention:** no GitHub/Vercel repo removal, sensor uninstall, secret rotation, DNS cutover or history pruning without exact evidence and separate owner review.

## Security launch gates
1. Authenticated read-only alert/evidence export; deny unauthorized requests and prove tokens are not exposed.
2. Staging health and network reachability from ATLAS without the sensor key.
3. Verify sensor heartbeat continuity and existing machine identity before and after integration.
4. Verify evidence-chain integrity independently; do not trust upstream `integrity: true` alone.
5. Confirm incident triage action escalation, minimum permissions, audit receipts and emergency stop.
6. Test offline security monitoring/analysis using installed local approved tools without network connectivity.
7. Confirm restoration from backup and no security data loss.
8. Confirm all destructive or intrusive tests are owner-approved for the specified targets.

## Learning
`cybersecurity-lead` participates in opt-in D1 learning proposals (migration `0010_specialist_learning.sql`) with provenance and manual promotion review. Proposed records are never auto-executed or auto-promoted.

**Current state:** profiles, routing, contracts and unit tests on draft PR #170. The live ATLAS–Safeguard connection, Mac automation and full security certification remain pending; no production change performed.
