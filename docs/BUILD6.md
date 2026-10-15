# Build 6 — Database-backed workforce service

The standalone TEAM application now includes server-side task creation, task listing, human approval decisions, and event history endpoints. Unlike the browser-only prototype, these handlers use a PostgreSQL connection when configured.

## Provisioning (not automatic)
1. Provision a **dedicated** PostgreSQL database for TEAM (not the database from another project).
2. Execute `db/schema.sql` once with a database admin.
3. Configure `TEAM_DATABASE_URL` and `TEAM_ADMIN_TOKEN` as secret server-side environment variables on the TEAM Vercel project.
4. Optionally configure `OPENAI_API_KEY` and `TEAM_MODEL` for text-only model responses; all external actions remain disabled.
5. Redeploy TEAM, verify `/api/health`, and exercise task create/list/approve with the bearer token.

## Routes
- `GET /api/tasks` — latest 100 tasks
- `POST /api/tasks` — JSON `{title,persona,priority}`
- `POST /api/approve` — JSON `{taskId,decision:'approved'|'rejected'}`
- `GET /api/events` — latest 100 event records

All routes require `Authorization: Bearer <TEAM_ADMIN_TOKEN>`. Approval is a workflow state and does NOT trigger model calls, web requests, shell commands or other external actions.

## Security and availability boundaries
- One operator shared bearer secret is a bootstrap interface, **not** enterprise per-user authentication or RBAC.
- Do not expose the operator secret in committed code, permanent browser storage, query parameters, logs or screenshots.
- Browser localStorage remains independent; it is not automatically synchronized to server storage.
- Database connection and schema are **not configured or tested** merely by deploying these APIs.
- Persistent multi-tenant identities, secret rotation, migrations, rate limiting, tenant isolation, and execution audit linkage remain production requirements.
