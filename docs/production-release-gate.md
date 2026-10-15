# ATLAS TEAM — Production Release Gate (Build 75)

**Certification status: BLOCKED until real production evidence exists.**

A passing GitHub test suite proves repository checks, not that agents are working or a cloud service has launched.

## Evidence required

1. Cloudflare published with a successful deploy job, and public worker smoke tests.
2. Dedicated TEAM database created, migrations applied, and persistence confirmed.
3. Real authenticated owner and persona identities; server-side privacy checks for private messages.
4. Approved task execution with durable retries, blocker escalation, recovery and proof of completion.
5. Shared persona room with delivered messages and a verified private message to the owner.
6. AI provider configuration and authenticated conversational/tool operations.
7. Least-privilege secrets, secure token storage and revocation.
8. End-to-end tests covering failure recovery and account access.
9. Production logging, alerting and health monitoring.

A persona may propose a name; final adoption and replica creation remain subject to owner approval. Gmail is lower priority than Microsoft 365 and remains opt-in.

## Current known blockers

Cloudflare GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are missing according to recent workflow results. No TEAM D1 binding or verified live database connection exists. No live agent runtime or authenticated shared chat is available. Microsoft 365 and Gmail have no verified runtime connections.

**Do not declare Build 75 a product launch.** Owner approval is required after all checks pass.
