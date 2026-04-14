# WorldWatch

WorldWatch is an internal analyst + operations system for **civilian, public-source geopolitical monitoring**. It ingests open-source signals, scores regional risk snapshots, and serves an analyst dashboard plus an internal ops console.

> WorldWatch is a civilian, public-source monitoring and analysis tool for personal, research, journalistic, and general geopolitical awareness use. It is not intended for military targeting, covert surveillance, sanctions evasion, or use by prohibited persons or entities.

## Product surfaces

- `GET /` or `GET /analyst` — analyst dashboard (table-first workflow, optional internal SVG map).
- `GET /ops` — internal operations console (scheduler/runtime visibility and manual cycle trigger).
- `GET /about` — internal About / Usage / Terms page that preserves canonical civilian-use and acceptable-use statements.

Analyst and ops surfaces render a deployment-posture banner and keep civilian-use guidance visible.

## Data/source coverage

Canonical source runners currently include:

- ACLED (`runAcledSourceJob.ts`)
- GDELT (`runGdeltSourceJob.ts`)
- IMF PortWatch (`runImfPortWatchSourceJob.ts`)
- EIA (`runEiaSourceJob.ts`)
- UNHCR (`runUnhcrSourceJob.ts`)
- NASA FIRMS (`runNasaFirmsSourceJob.ts`)

## Runtime + scheduler scripts

All scripts run with Node TypeScript strip-types mode.

- `npm run db:migrate` — apply SQL schema migrations.
- `npm run db:seed` — seed regions and data source metadata.
- `npm run cycle:run` — run one complete ingestion + scoring cycle.
- `npm run scheduler:start` — run recurring scheduler loop.
- `npm run api:start` — start API + dashboard server.
- `npm run deploy:web` — Railway/web boot command (analyst + ops + API server only).
- `npm run deploy:scheduler` — Railway/scheduler boot command (recurring cycle executor only).

## Environment variables

### Required

- `DATABASE_URL`
- `ACLED_URL`
- `GDELT_URL`
- `IMF_PORTWATCH_URL`
- `EIA_URL`
- `UNHCR_URL`
- `NASA_FIRMS_URL`

### Required on Railway web service

- `PORT` (injected by Railway; app listens on `process.env.PORT`)

### Optional

- `DEPLOYMENT_POSTURE` (`internal` | `invite_only` | `public_read_only`, default `internal`)
- `DEPLOYMENT_BANNER_TEXT` (optional banner override)
- `DEPLOYMENT_SUBTITLE_TEXT` (optional subtitle override)
- `CYCLE_INTERVAL_MINUTES` (scheduler interval override, default `15`)

## API overview

### Analyst endpoints

- `GET /api/analyst/dashboard` (consolidated payload for dashboard bootstrap)
- `GET /api/analyst/summary`
- `GET /api/regions`
- `GET /api/regions/geo`
- `GET /api/regions/:slug`
- `GET /api/feed`
- `GET /api/history/:slug`

### Ops endpoints

- `GET /healthz` (Railway healthcheck endpoint; live + DB readiness probe)
- `GET /api/ops/health`
- `GET /api/ops/summary`
- `GET /api/ops/cycle/latest`
- `GET /api/ops/cycles?limit=20`
- `GET /api/ops/sources/runs?limit=50`
- `GET /api/ops/source-freshness`
- `GET /api/ops/failures?limit=20`
- `POST /api/ops/cycle/run`

## Civilian acceptable use

You may not use WorldWatch to support military targeting, kinetic operations, covert surveillance, sanctions evasion, unlawful export activity, or access by prohibited persons or entities. WorldWatch is intended for lawful public-source monitoring and analysis only.

## ARC cohort baseline pipeline (PR2 follow-up)

After PR2 cohort tables are generated, build ARC baseline summary tables with:

- `python -m arc.cli build-baselines`

Required inputs:

- `outputs/cohort_tables/arc_player_weeks.csv`
- `outputs/cohort_tables/arc_player_seasons.csv`

Canonical outputs:

- `outputs/summary_tables/arc_cohort_baselines.csv`
- `outputs/summary_tables/arc_career_year_baselines.csv`

If a parquet engine is installed (`pandas` + `pyarrow`), matching parquet files are also written next to the CSVs.
