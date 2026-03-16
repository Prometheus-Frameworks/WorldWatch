# ARCHITECTURE

## 1) Source ingestion flow
1. Scheduler or manual trigger starts a world cycle (`runWorldWatchCycle`).
2. Source jobs run sequentially for ACLED, GDELT, IMF PortWatch, EIA, UNHCR, and NASA FIRMS.
3. Each runner fetches upstream JSON, maps events/signals to tracked regions, and persists results.

## 2) Normalization
- Raw source payloads are persisted to `raw_events`.
- Region-mapped normalized metrics are written to `normalized_signals`.
- Adapters (`src/ingestion/adapters/*`) standardize source-specific schemas before scoring.

## 3) Scoring snapshot pipeline
- Snapshot job (`runScoringSnapshotJob`) runs when at least one source job succeeds.
- It uses config-driven normalization and sub-score weights (`src/jobs/scoringSnapshot/config.ts`).
- Deterministic outputs:
  - `region_scores`
  - `region_deltas`
  - `alerts_feed`
- Scoring semantics come from shared calculator logic (`src/shared/scoring/calculator.ts`): composite score, status band, confidence band, freshness state, evidence state.

## 4) Scheduler/runtime
- `createCycleScheduler` runs recurring cycles at configured interval.
- Overlap protection skips starting a new cycle while one is in-flight.
- Runtime logging captures start/end/error metadata and source/snapshot counts.

## 5) Ops API + console
- Ops surface: `GET /ops`.
- Ops endpoints provide health, summary, cycle history, source runs, source freshness, failures, and manual trigger.
- Manual trigger endpoint (`POST /api/ops/cycle/run`) is posture-gated.

## 6) Analyst dashboard / detail / map
- Analyst surface: `GET /` and `GET /analyst`.
- Preferred bootstrap endpoint: `GET /api/analyst/dashboard` (regions + geo + feed + summary).
- Table/detail workflow is primary; map is optional spatial context (layout toggle + synchronized selection/hover).
- Region detail includes triage notes, deterministic explainability summaries, contributing factors, source contributions, disagreement groups, and score/delta history.

## 7) Posture enforcement
- Deployment posture is resolved from config (`internal`, `invite_only`, `public_read_only`).
- Surfaces render posture banner text.
- `public_read_only` explicitly blocks manual cycle execution.

## 8) Policy surface
- `/about` renders canonical civilian-use and acceptable-use statements.
- Analyst and ops surfaces include policy footer/context so civilian/public-source boundary remains explicit in day-to-day use.
