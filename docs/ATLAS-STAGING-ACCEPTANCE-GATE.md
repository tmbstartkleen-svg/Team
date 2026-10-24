# Large package 1 — Staging integration acceptance gate

Status: BLOCKED pending a **new, owner-approved, provider-verified isolated database**. This is a read-only completion checklist, not launch certification.

## Preconditions
- Dedicated empty PostgreSQL project created without copying or branching production data.
- Independent provider API verifies staging project/branch/role identity and separation from production. Self-reported `providerVerified: true` is not proof.
- Staging-only privileges, TLS, secret custody and network restrictions reviewed.
- Owner separately approves applying the PostgreSQL `db/schema.sql` to the new empty staging project.
- Vercel preview receives staging-only environment variables; the production database and real provider model credentials remain inaccessible.
- Both protected certification tasks remain unchanged; general executor disabled.

## Required acceptance evidence
1. CI passes on the exact PR head SHA.
2. Vercel preview serves that SHA; `GET /api/health` reports `productionOperational=false`, `autonomousAgents=false`.
3. Anonymous `GET /api/tasks`, `POST /api/plan` and `POST /api/execute-approved` cannot perform actions.
4. After independent staging authorization: create one synthetic task, read it back, verify durable audit events and permissions.
5. Verify task approval and model execution do not occur automatically, then clean up **only synthetic** records using an independently authorized procedure.
6. Store evidence and independent reviewer decision without promoting the draft PR.

## Cannot be claimed yet
- Live database-backed workflows verified
- Independently authenticated deployment bundle and signatures
- Owner-approved read/write certification, replay denial, multi-persona execution
- Production security approval or operational launch

**Operational launch milestones remaining: five.** No counted milestone is certified by passing CI or an HTTP 200 preview.
