# ATLAS TEAM controlled release certification

## Verified evidence

- Production read-only smoke: GitHub Actions run 38996267291 passed. Health, D1 readiness, launch readiness, persona readiness, and anonymous executor denial passed.
- Isolated recovery certification: run 38996291631 passed. This is in-memory SQLite/test-double evidence only and is not production D1 recovery certification.
- Live executor boundary: run 38996922555 passed. Anonymous request returned 401; authenticated request returned 503 while the executor was disabled.

## Hard release gates still open

1. **Production recovery certification:** not established by isolated SQLite tests. Require a dedicated test task or isolated production test database and verify lease expiry/recovery without touching user tasks.
2. **Approved-task end-to-end test:** create a dedicated owner-approved test task, execute only that task using Cloudflare Workers AI, then independently query D1 to verify task state and immutable receipt.
3. **Failure-path test:** demonstrate provider/receipt failure ends blocked and never reports verified.
4. **Release review:** inspect audit trail, service-token scope, rate limits, cost/quota limits, rollback plan, and final launch-readiness endpoint.

## Safety rules

- Do not enable general autonomous execution to perform certification.
- Do not reuse or mutate a user task as a test fixture.
- Never mark `TEAM_RECOVERY_CERTIFIED=true` based only on unit or in-memory SQLite tests.
- Keep the executor disabled until a dedicated test-task path and owner approval are verified.
- Do not put tokens, inference output, task content, or private data into workflow logs.

## Completion criterion

Launch can be considered only after the dedicated approved test task has a successful inference result and matching D1 receipt, failure-path checks pass, production recovery evidence is documented, and the deployed launch-readiness endpoint reflects those independently verified gates.
