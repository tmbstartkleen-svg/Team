# ATLAS workflow journal — recovery model (not durable persistence)

This build introduces a hash-linked **in-memory** workflow journal with deterministic replay, idempotency keys, cancellation, and a permanently blocked owner-approval stage. Run:

```sh
node scripts/workflow-journal-demo.mjs "Research customer retention metrics"
```

Hash links detect accidental alteration; they are not signatures, identity verification, or tamper-proof storage. The journal is not yet saved to an external database, so recovery only works from a preserved journal object. There are no tool calls, model calls, credentials, network requests, protected-task changes or agent execution. Human approval cannot be fabricated by a journal event.

Before a durable deployment, add a transactional database adapter with unique workflow/event IDs, expected-sequence compare-and-swap, access control, sensitive payload filtering, retention, audit authorization, and integration tests. Do not label this as a running autonomous workforce or production-ready persistence layer.
