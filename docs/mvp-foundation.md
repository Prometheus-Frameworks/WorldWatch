# WorldWatch Foundation (Current Internal Posture)

WorldWatch is an **internal-facing analyst + operations system** built around a stable schema, deterministic scoring, and explainable public-source inputs.

## Canonical system components

- Runtime + scheduler (`src/runtime/*`, `src/scripts/runScheduler.ts`)
- Ingestion/source runners (`src/jobs/sourceRunners/*`)
- Snapshot scoring (`src/jobs/scoringSnapshot/*`)
- Analyst dashboard (`/`)
- Internal SVG analyst map (`/api/regions/geo` consumed by dashboard)
- Ops console and ops API (`/ops`, `/api/ops/*`)

## Analyst workflow emphasis

The table/detail workflow is primary:

- region table + filters + detail panes drive analysis
- map is optional through layout toggle and serves as spatial context
- map/table/filter selection stays synchronized to avoid split-brain UX

## API shape

Analyst UX can bootstrap from a consolidated payload at `GET /api/analyst/dashboard`, while existing granular endpoints remain available.

Ops endpoints provide cycle health, source freshness, failures, run history, and manual cycle execution.

## Policy posture

WorldWatch is a civilian public-source monitoring tool. It is intended for lawful research, journalistic, personal, and general geopolitical awareness use.

It is explicitly not intended for military targeting, kinetic operations, covert surveillance, sanctions evasion, unlawful export activity, or prohibited-user access.
