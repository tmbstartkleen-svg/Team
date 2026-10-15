# TEAM Build 15 — execution policy and readiness contract

The server's authenticated model-policy endpoint describes which model is selected, allowed, and configured. It reports bounded output tokens and request timeout.

This is NOT a billing quota. TEAM_MONTHLY_BUDGET_USD is a planned configuration indicator only; no automatic provider spend cap is enforced. Use provider account-level limits until backend metering and per-user budgets are implemented.

The deployed app still cannot claim autonomous completion without a dedicated database, credentials, end-to-end execution verification, per-user authorization, and offline inference.
