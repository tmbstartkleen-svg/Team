# ATLAS TEAM — Fixed Six-Build Integration Roadmap (189–194)

**Scope:** This is a fixed six-build engineering plan, not a promise that production will pass certification or that every external service can be connected without owner credentials. Do not add build numbers for normal fixes: repair failures within the original build PR.

| Build | Acceptance criteria |
|---|---|
| **189** | D1 action reservation is wired to permissioned tool runner; duplicate requests never silently replay; outcome persisted before verified response. |
| **190** | Authenticated executor endpoint invokes the durable runner; database schema and configuration fail closed; no public anonymous action path. |
| **191** | Real read-only connector, with least-privilege credentials, validated evidence, and bounded outputs. |
| **192** | Owner-approved write connector, per-action confirmation, provider-side idempotency or reconciliation, and auditable receipts. |
| **193** | Persona task orchestration, dependent steps, resume/repair handling, and transparent blocked states in the owner UI. |
| **194** | Full regression, production integration, security and rollback certification; documented release decision and owner sign-off. |

## Release and reporting rules
1. Merge pending Build 184–188 changes in dependency order after CI passes; 189 depends on 188.
2. A successful CI run is **not** proof of working production agents.
3. Report two separate states: **six-build engineering roadmap progress** and **production certification**.
4. Any new bug found before 194 is fixed inside its assigned build rather than increasing the count.
5. Owner-supplied access, deployment secrets, billing or consent may block production certification. Do not assert launch without live evidence.
6. Success means approved work can execute through real authorized connectors and independently verified outcomes. Never claim every imaginable task is executable.
