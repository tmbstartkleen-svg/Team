# ATLAS staging certification hardening — integrated release checklist

This checklist tracks implementation and evidence. It is not an approval or a live certification receipt.

## Code gates
- [x] Dedicated staging-only handler exists with explicit environment/feature-flag checks.
- [x] Handler rejects protected historical task IDs and requires the task ID to match the configured new staging task.
- [x] Handler loads the grant from D1 rather than trusting caller-supplied approval data.
- [x] Handler constrains the tool/capability/persona and GitHub target to one read-only repository identity request.
- [x] Handler uses the durable execution boundary and a task-scoped durable-object ledger.
- [x] Worker route is wired under service authentication.
- [x] Negative tests cover default-off behavior, production rejection, executor-release flags, bad grants, missing dependencies, malformed payloads, and receipt failure.
- [x] Durable runner tests cover reservation-before-provider, receipt persistence, and replay denial.
- [ ] Latest draft branch head has a green application and isolated PostgreSQL CI run.
- [ ] Live route deployment SHA matches the CI-tested draft branch head.

## Live certification gates
- [ ] Staging-only credentials and flags are independently reviewed; general executor remains disabled.
- [ ] A fresh task ID is created and explicitly approved by the owner in the trusted workflow.
- [ ] Persisted D1 grant and assignment are read back independently before execution.
- [ ] One actual GitHub GET verifies repository identity for `tmbstartkleen-svg/Team`.
- [ ] Durable ledger receipt is retrieved independently and bound to task ID, step ID, provider receipt, and environment.
- [ ] A repeat attempt for the same task/step is denied before a second provider call.
- [ ] Provider errors, timeout, and receipt-persistence failure are reconciled without automatic replay.
- [ ] Logs and evidence are redacted and retained with commit SHA, deployment ID, UTC timestamp and reviewer.

## Release and safety gates
- [ ] End-to-end multi-persona dependency workflow including a blocked step and controlled retry.
- [ ] Monitoring, rollback and recovery are verified in staging.
- [ ] Independent reviewer validates evidence and least-privilege grants.
- [ ] Owner explicitly approves any production release in a separate change window.

## Protected constraints
- `cert-github-read-20261019-v2` remains unapproved and unexecuted.
- Historical `cert-github-read-20261018` remains `needs-reconciliation`; never replay it automatically.
- Never enable `TEAM_TOOL_EXECUTOR_ENABLED` or `TEAM_TOOL_EXECUTOR_RELEASED` to make staging certification pass.
- No production deployment, migration, or write adapter is authorized by this checklist.
- Passing mocked tests or a prior preview smoke does not certify a newer deployment SHA.
