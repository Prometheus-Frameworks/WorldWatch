# POSTURE_AND_POLICY

## Canonical posture
WorldWatch is a civilian, public-source geopolitical monitoring and analysis system for lawful research, journalistic, personal, and general awareness use.

## Explicit non-goals
- Military targeting or kinetic decision support.
- Covert surveillance workflows.
- Sanctions evasion or prohibited-user enablement.

## Deployment posture behavior
- `internal`: default internal operating mode.
- `invite_only`: limited distribution mode with same civilian-use boundaries.
- `public_read_only`: read-only access posture; manual cycle trigger is disabled by API enforcement.

## Surface-level enforcement
- Analyst, ops, and policy pages render deployment posture banner context.
- Policy/about surface (`/about`) keeps civilian-use + acceptable-use statements explicit.
- Analyst and ops UIs include policy footer guidance to reduce posture drift during normal operations.

## Engineering guardrails
- Any new endpoint or UI change must preserve civilian/public-source language and avoid posture ambiguity.
- Runtime behavior changes must not bypass read-only restrictions for manual cycle control.
