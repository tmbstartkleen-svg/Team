# Safeguard read-only status integration (ATLAS)

**Status:** draft feature branch only. No production data migration or Mac sensor changes.

## Configuration
On Cloudflare ATLAS Worker, configure secrets/settings via the hosting provider:
- `TEAM_OWNER_API_TOKEN`: existing owner authorization token, minimum 32 characters. Do not include it in the repository or UI.
- `ATLAS_SAFEGUARD_BASE_URL`: HTTPS origin of the existing Safeguard deployment. No path/query, redirects, IP literals, localhost or private-name hosts.
- `ATLAS_SAFEGUARD_ALLOWED_ORIGIN`: a separately configured exact HTTPS origin that must match `ATLAS_SAFEGUARD_BASE_URL`; mismatches or missing pins fail closed.
- `ATLAS_SAFEGUARD_PUBLIC_CHANNEL`: existing Safeguard channel identifier, configured on the server only. Never expose channel or sensor pairing secret in UI.

On Vercel ATLAS standby use `TEAM_ADMIN_TOKEN` instead of `TEAM_OWNER_API_TOKEN` alongside all three `ATLAS_SAFEGUARD_*` variables. The two hosting authentication systems are not automatically the same.

The dashboard Security Operations tab accepts the appropriate ATLAS token for its current host and makes a GET to `/api/safeguard-status`. The token is not persisted in local storage by that form.

## Data contract
The adapter reads only:
- Safeguard `GET /api/health`
- Safeguard `GET /api/agent/public-status?channel=...`

It never calls Safeguard's `GET /api/monitoring/status`, which can change alert state as a side effect. No sensor keys or network commands are involved. Outputs are projected onto an allowlist of service readiness, last seen, sensor connection state and version. No untrusted upstream fields are returned.

## Security and release gates
- Verify target deployment origin and DNS are organization-controlled; the current URL guard and exact-origin pin reject unexpected configured origins but are **not a complete DNS rebinding or SSRF mitigation**. Restrict outbound origins via operational egress controls or a trusted host allowlist before enabling arbitrary configuration.
- The read endpoint must remain owner-authenticated. Do not expose the channel or pairing secret to browser clients.
- Validate expiry/freshness and sample heartbeat behavior in a real staged environment. A service marked ready is not proof of endpoint-to-endpoint sensor continuity.
- Perform a reviewed offline test run: `node --test tests/safeguard-*.test.mjs tests/unified-capability-policy.test.mjs` and check all other baseline tests.
- Verify both Cloudflare and Vercel previews before production. The current Vercel provisioning failure is unrelated to proven application test results and must be diagnosed separately.
- Safeguard's standalone dashboard, sensor LaunchAgent and Keychain identity remain operational throughout dual run.
- Keep PR #170 draft; no merge, deployment promotion, repo deletion, data migration or protected task approval until the owner authorizes the exact operation.

## Alerts and evidence Phase 2 (contract only)

`lib/safeguard-security-feed-projection.mjs` adds pure metadata projections for monitoring alerts and evidence-chain entries. The allowlist **excludes** alert messages, targets, evidence payloads, sensor identities, pairing keys, and raw response documents. Evidence integrity is reported as an upstream assertion, **not** independently verified by ATLAS.

The existing Safeguard endpoints `GET /api/monitoring` and `GET /api/evidence` demand `x-sentinel-key`, which is the sensor-pairing credential. **Do not configure that key in ATLAS.** `GET /api/monitoring/status` additionally performs writes and must never be used for a read-only dashboard.

Until Safeguard implements and certifies a new least-privilege, owner-authorized read-only export endpoint with a separately scoped credential and an auditable authorization model, the ATLAS alert/evidence feed must return a non-connected state. Do not represent it as zero incidents or zero evidence. Treat migration of evidence content separately, with explicit owner approval and encryption/retention controls.
