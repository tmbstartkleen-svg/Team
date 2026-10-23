# ATLAS offline release evidence review

This is a **non-executing, commit-scoped** tool for reviewing a saved pair of JSON files. It never calls remote endpoints, approves tasks, deploys, runs agents, or writes database rows. It does not create evidence itself.

```sh
node scripts/verify-release-evidence.mjs --health ./health.json --evidence ./evidence.json --commit ae8e51878898
```

The health input must be the complete captured `/api/health` JSON body for that commit. The evidence input must be a contemporaneous, trustworthy saved staging smoke result with task ID, exactly one creation and rejection event, and verified HTTP 409. Reconstructing evidence by hand is **not** a substitute for an authentic captured record. The printed SHA-256 digest is a local fingerprint, **not** a digital signature or external attestation.

The command exits nonzero when the exact commit differs, evidence is incomplete, or Preview safety gates fail. It always reports `productionLaunchReady:false` and `productionApprovalGranted:false`; the staging test does not authorize launching agents or promoting Production.

Historical evidence for `ae8e51878898` is documented in `docs/ATLAS-STAGING-CERTIFICATION-LEDGER.md`, but later commits must be verified separately. Do not manufacture JSON inputs from that ledger to bypass the release process. Never save operator tokens, authorization headers, or database credentials in evidence files.
