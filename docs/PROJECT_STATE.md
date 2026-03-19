# PROJECT_STATE

## Canonical subsystems
- **Web surface**: one Node HTTP service serving analyst dashboard, ops console, policy/about page, and JSON APIs.
- **Scheduler**: separate recurring cycle runner with overlap protection.
- **Ingestion + normalization**: ACLED, GDELT, IMF PortWatch, EIA, UNHCR, and NASA FIRMS adapters feeding deterministic normalized signals.
- **Scoring snapshots**: deterministic region scores, deltas, alerts feed, explainability, Focus Mode summaries, pinned sections, and snapshot compare.
- **Operational guardrails**: source-quality cues, source degradation trend telemetry, recurring stale/failure pattern visibility, and posture enforcement.
- **Deployment layer**: internal-first Railway guidance, release-readiness checklist, and explicit web vs scheduler launch paths.

## What is production-like now
- Deterministic ingestion → scoring → API/runtime flow with tests around scoring, API payloads, scheduler behavior, config parsing, and posture visibility.
- Analyst dashboard is canonical for internal use, including Focus Mode, pinned sections, compare, deterministic explainability, and internal map support.
- Ops console is canonical for internal use, including cycle status/history, source freshness/failures, degradation trends, and posture-gated manual trigger behavior.
- Railway deploy shape is defined: Postgres + `worldwatch-web` + `worldwatch-scheduler`, with `/healthz` for DB-backed web readiness.

## What is intentionally still narrow
- First launch posture should remain `internal`.
- Internal map remains supporting context, not the primary workflow.
- No auth, no marketing shell, no scoring-math changes, and no public-facing product expansion in this sprint.

## Current priorities
1. Make the first Railway launch difficult to misconfigure.
2. Keep startup/readiness/runtime errors explicit and operator-readable.
3. Preserve deterministic analyst + ops behavior while repo-memory docs track reality.

## Current risks
- Miswired `DATABASE_URL` or incomplete source endpoint vars will prevent service boot; that is now intentional fail-fast behavior.
- Compare/history views will look thin on brand-new deployments until at least one scheduler cycle and subsequent snapshots complete.
- Source-quality cues help interpretation but do not replace analyst judgment.
