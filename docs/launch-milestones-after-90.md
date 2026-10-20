# ATLAS TEAM launch milestones after Build 90

> **Historical planning snapshot — not the active launch countdown.** For current blockers and release evidence, see [Issue #91](https://github.com/tmbstartkleen-svg/Team/issues/91). No general agent release is certified merely by passing CI, deployment, or read-only smoke tests.

A build number is not evidence that the product is operational.

## Gates proposed at Build 90
1. Provision a dedicated D1 database and bind TEAM_DB to this Worker.
2. Apply and verify database migrations 0001-0005 in order.
3. Implement and test owner authentication and persona-scoped authorization.
4. Connect persistent project rooms, task queue, escalations and delivery receipts to authenticated APIs.
5. Activate an approved AI agent executor with bounded tools, retries, recovery and audit logs.
6. Connect owner-consented Microsoft 365 and optional Gmail workflows.
7. Run full end-to-end production security, reliability and usability certification.

## Historical release targets
- **Working beta:** Gates 1-5 plus security smoke tests; mailbox integrations optional.
- **Full feature launch:** All seven gates and owner approval.
- An early estimate called for **5-7 major integration builds**. This is not a current build count or release prediction.

## Status recorded at Build 90
At that time the record found a successful Cloudflare deploy and edge health check, but lacked evidence for several database, runtime, messaging, and external app connections. **These statements are historical, not current status assertions.**

## Active certification rule
Refer to Issue #91 for the current release checklist. Its outstanding milestones include separately owner-authorized GitHub read and write certification, dependent multi-persona execution, production reliability and security certification, and final owner signoff.

The reserved task `cert-github-read-20261019-v2` must stay unapproved and unexecuted unless the owner explicitly changes that instruction. No service should be represented as connected or operational without live evidence.
