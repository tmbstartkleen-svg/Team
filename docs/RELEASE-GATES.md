# ATLAS TEAM release gates

## Current
The app can render a dashboard, generate deterministic role plans, handle approved text-only model execution when a dedicated database and credentials are configured, and expose protected readiness diagnostics.

## Required before complete
1. Dedicated TEAM PostgreSQL database provisioned and schema verified, with production backup and tested recovery.
2. Vercel environment values configured without leaking secrets to client code.
3. Real API request and task lifecycle tested on the deployed app.
4. Authenticated per-user identities, role-based access, and clear separation between approver and executor.
5. Reliable orchestration across multiple workers, bounded retries, recoverable leases, and immutable audit semantics.
6. Offline model runtime actually installed and tested on supported equipment.
7. Load, accessibility, security, cost, and production failure-mode testing.
8. Provider usage budgets and account entitlements verified.

A CI PASS and Vercel READY certify only that the repository checks and deployment completed. They do not certify these production capabilities.
