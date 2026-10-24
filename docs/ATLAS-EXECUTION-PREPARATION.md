# ATLAS controlled execution preparation

This package defines **contracts**, not active agents. It supplies a deterministic workflow ID, a restricted planning capability list, a provider inventory, a non-authorizing permission assessment and a fingerprinted **local-only** receipt.

Run offline:

```sh
node scripts/execution-preflight.mjs "Research customer retention metrics"
```

Nothing contacts an AI provider, reads secrets, starts a task, writes to a database, or authorizes external actions. The `fingerprint` and `digest` are SHA-256 content checksums, not signatures. A receipt explicitly states `recordPersisted:false`; it must never be represented as durable audit evidence.

Provider choices are future targets only. Real operation requires owner authorization, secret storage, a reviewed and permission-scoped adapter, model smoke tests, durable idempotent task state, an auditable execution approval trail, and production isolation. This module cannot certify production readiness.
