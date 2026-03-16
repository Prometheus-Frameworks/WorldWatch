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
- Internal map is supporting context, not the primary workflow.
- Source quality handling is deterministic but still dependent on upstream source freshness/availability.
- Explainability language for multi-domain disagreement is deterministic but still heuristic in phrasing.

## Recently completed sprints (latest)
- Analyst detail readability/scanability pass tightened hierarchy and spacing while preserving table/detail-first workflow (complete).
- Explainability quick-scan cards now foreground freshness/confidence/evidence and mixed-signal/stale-risk posture before dense tables.
- Source disagreement and source contribution sections were reformatted into more scannable structured tables (domain/type/sources/direction/recency/reliability).
- Validation + edge-case pressure-test pass landed for freshness, confidence/severity mismatch, disagreement integrity, and domain odd cases in scoring/explainability tests.
- Map/table sync behavior and deterministic scoring/provenance model were preserved.

## Known weak spots
- Detail pane can be cognitively dense under mixed signals and disagreement-heavy regions.
- High-risk + low-confidence scenarios still require disciplined human validation to avoid over-reading noisy data.
- Freshness degradation can drive stale-high-risk states that need operator reruns and analyst verification.

## Immediate next priorities
1. Add reusable region-scenario fixtures for analyst-trust edge-case validation to keep future scoring/explainability changes comparable.
2. Tighten explainability phrasing for multi-domain disagreement while preserving deterministic, inspectable derivation.
3. Keep posture/policy language and enforcement behavior aligned during UI/API changes.
