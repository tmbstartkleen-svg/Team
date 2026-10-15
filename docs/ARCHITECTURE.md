# TEAM architecture and release boundaries

TEAM is an independent product and repository. No SafeGuard or EdgeForce runtime may be treated as a TEAM backend.

## Current functionality
- Static HTML dashboard deployed on Vercel
- Browser-local project and task records; these are not multi-user or durable on other devices
- Deterministic keyword-based specialist recommendations in a versioned library
- Local human approval workflow and activity history
- JSON export/import for portability

## Not yet functional
- AI model inference, provider API credentials, paid-model entitlements, local GPU execution
- Autonomous agents or scheduled background tasks
- Server persistence, team accounts, cross-device synchronization, authorization and RBAC
- Signed audit events, server-side review decisions and secure secret storage

## Production gate
Do not claim these capabilities as available until tested against real configured providers and authenticated storage. Never store provider API secrets in localStorage or browser code. Require scope-limited actions, explicit approval, model availability probes, usage caps, trace identifiers, prompt/tool-injection controls, and error recovery before enabling external actions.

## Next backend contract
POST /api/tasks: authenticated scoped task creation, idempotency key, immutable history.
POST /api/tasks/:id/approve: explicit actor, approval and permitted tool scope.
POST /api/tasks/:id/execute: server worker invokes configured provider; leases, timeouts, bounded retries.
GET /api/tasks/:id: authenticated status and evidence.
GET /api/models: configured capabilities verified through safe probes, never assumptions.
