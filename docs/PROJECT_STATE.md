# PROJECT_STATE

## Current major subsystems
- **Backend API + HTML surfaces**: single Node HTTP server (`src/api/server.ts`) serving analyst (`/`), ops (`/ops`), and policy/about (`/about`) surfaces plus analyst/ops JSON endpoints.
- **Ingestion + normalization**: source runners and adapters ingest ACLED, GDELT, IMF PortWatch, EIA, UNHCR, and NASA FIRMS data into raw and normalized tables.
- **Scoring snapshot pipeline**: deterministic scoring computes region scores, confidence/freshness/evidence states, deltas, and alert feed outputs.
- **Scheduler/runtime**: recurring scheduler with overlap protection, plus manual cycle execution path (posture-gated).
- **Analyst console**: table-first dashboard with region detail drill-down, triage notes, explainability groupings, history tables, and optional internal SVG map.
- **Ops console**: cycle health/summary/failures/source freshness visibility plus manual cycle trigger.
- **Posture + policy layer**: deployment posture bannering and explicit civilian/acceptable-use statements across surfaces.

## Production-like vs prototype
### Production-like
- Deterministic ingestion -> scoring -> API flow with test coverage in runtime, API queries/payload shaping, scoring calculator, and snapshot jobs.
- Posture enforcement for `public_read_only` (manual cycle trigger disabled).
- Stable internal analyst + ops workflow powered by consolidated analyst payload (`/api/analyst/dashboard`).

### Still prototype / evolving
- Analyst detail readability/scanability still being iterated (especially dense explainability sections).
- Internal map is supporting context, not the primary workflow.
- Source quality handling is deterministic but still dependent on upstream source freshness/availability.

## Recently completed sprints (latest)
- Scoring freshness/evidence and provenance were refined.
- Analyst detail explainability states and factor provenance were added.
- Source disagreement handling was expanded in analyst detail explainability.
- Analyst client architecture was modularized and payload shaping tightened.

## Known weak spots
- Detail pane can be cognitively dense under mixed signals and disagreement-heavy regions.
- High-risk + low-confidence scenarios still require disciplined human validation to avoid over-reading noisy data.
- Freshness degradation can drive stale-high-risk states that need operator reruns and analyst verification.

## Immediate next priorities
1. Improve analyst detail readability and scanability without reducing deterministic traceability.
2. Validate triage UX for stale high-risk, mixed-signal, and low-confidence/high-severity cases.
3. Keep posture/policy language and enforcement behavior aligned during UI/API changes.
