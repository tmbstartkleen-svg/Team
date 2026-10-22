# ATLAS backend connection runbook (draft preview only)

## Current proven state
The Team Vercel preview returns HTTP 200 from /api/health, but reports operatorSecretPresent, databaseUrlPresent, modelKeyPresent and modelAllowlistPresent as false. This is **not** an operational agent runtime. GitHub CI and deployment readiness do not certify tool execution.

## Integration boundaries
1. Keep pull requests #146 and #147 open, draft and unmerged until separately authorized.
2. Never use protected historical certification tasks for smoke tests.
3. Configure preview-only credentials through a separately authorized and scoped Vercel environment change. Never paste credentials into the browser, GitHub commits, logs, or chat.
4. The Vercel server currently uses PostgreSQL TEAM_DATABASE_URL; the separate Cloudflare runtime uses D1. They are **not interchangeable**. Do not point Vercel to production D1 or infer Postgres health from Cloudflare D1 status.
5. Treat TEAM_ADMIN_TOKEN as sensitive. No endpoint should expose it or attempt to use a browser-local token as owner authentication.
6. No owner grant, GitHub write, execution, or autonomous agent activation until independent evidence and explicit scoped owner approval have been certified.

## Safe preview verification sequence
- GET /api/health without credentials: verify service=atlas-team, environment=preview, productionOperational=false, and expected releaseCommit.
- GET /api/readiness and /api/database-health without credentials: expect 401; a 401 protects privileged details and is not a backend failure.
- After explicit approval and separate credential provisioning, perform authenticated read-only /api/database-health verification; this checks PostgreSQL tables, read access, and privileges, but performs no actual database writes.
- Do not treat a 200 from health or a configured model key as proof of inference, agent operation, or audit-receipt correctness.
- For a live certification, create *new* owner-approved scoped tasks, independently record authenticated approval and denial events, reconcile durable receipts and require release signoff.

## Outstanding gates
- Decide intended authoritative backend (Cloudflare Worker/D1 versus Vercel/PostgreSQL), production deployment topology, and trust boundary.
- Provision preview-only database and identity configuration once approved.
- Implement and wire genuine trusted origin capture at source rather than replaying browser or test assertions.
- Run separately owner-approved certifications and disaster-recovery tests before launch.
