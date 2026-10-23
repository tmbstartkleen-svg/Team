# ATLAS workforce planning — deterministic and offline

The planner turns a task title into a specialist handoff proposal, quality review, and owner approval checkpoint. It uses the existing 18-persona roster and deterministic keyword routing. It is **not** an LLM, active agent, background service, or durable task executor.

```sh
node scripts/workforce-plan.mjs "Fix backend software bug"
node scripts/workforce-plan.mjs "Deploy production release"
```

The output is JSON for inspection or a future user interface. It performs no network calls, no database writes, no model requests, no approvals and no external side effects. Sensitive requests receive an additional security review. Never treat `status: planned` as proof a human or agent performed the work.

Future integration requires explicit owner authorization, an actual model/runtime connection, strict per-tool permissions, durable task state and independently validated audit evidence. This planning layer does not change those gates.
