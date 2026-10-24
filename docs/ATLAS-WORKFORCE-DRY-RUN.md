# ATLAS workforce dry-run engine

The deterministic planner is extended with a dependency graph, 18-persona capability matrix and offline review markers.

```sh
node scripts/workforce-simulate.mjs "Fix backend software bug"
node scripts/workforce-simulate.mjs "Deploy production release"
node scripts/workforce-simulate.mjs --capabilities
```

This engine intentionally does **not** run language models, tools, autonomous agents, network requests or persistence writes. A completed step marker means an operator may review that stage; it does not mean the task was executed or audited. The final approval node is always blocked, even if all preceding markers are set.

This is an incremental planning interface. Before real model execution, ATLAS needs a provider adapter, capability-scoped tools, separate permission controls, durable state, auditable human authorization and failure recovery. No mock result should be described as a completed external action.
