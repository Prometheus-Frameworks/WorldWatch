# WorldWatch

WorldWatch is a civilian, public-source geopolitical awareness product with two clear surfaces:

- **Civilian surface (`/`)**: plain-English readiness summaries for public audiences.
- **Analyst + ops surfaces (`/analyst`, `/ops`)**: deeper regional scoring, feed detail, and runtime visibility.

> WorldWatch is a civilian, public-source monitoring and analysis tool for personal, research, journalistic, and general geopolitical awareness use. It is not intended for military targeting, covert surveillance, sanctions evasion, or use by prohibited persons or entities.

## Product surfaces

- `GET /` — civilian readiness homepage (default front door in `DEPLOYMENT_POSTURE=public_read_only`).
- `GET /analyst` — analyst dashboard (raw feeds, score tables, region drilldowns).
- `GET /ops` — operations console (cycle/source freshness + runtime visibility).
- `GET /about` — usage, policy, and terms.

## Deployment posture behavior

- `internal` (default): `/` and `/analyst` both open the analyst dashboard.
- `invite_only`: `/` and `/analyst` both open the analyst dashboard with invite-only posture copy.
- `public_read_only`: `/` opens the civilian readiness homepage; `/analyst` and `/ops` remain available read-only.

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
- `npm run deploy:web` — Railway/web boot command (web + API service).
- `npm run deploy:scheduler` — Railway/scheduler boot command (recurring cycle executor).

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

- `GET /api/analyst/dashboard`
- `GET /api/analyst/summary`
- `GET /api/regions`
- `GET /api/regions/geo`
- `GET /api/regions/:slug`
- `GET /api/feed`
- `GET /api/history/:slug`

### Ops endpoints

- `GET /healthz`
- `GET /api/ops/health`
- `GET /api/ops/summary`
- `GET /api/ops/cycle/latest`
- `GET /api/ops/cycles?limit=20`
- `GET /api/ops/sources/runs?limit=50`
- `GET /api/ops/source-freshness`
- `GET /api/ops/failures?limit=20`
- `POST /api/ops/cycle/run` (blocked in `public_read_only`)

## Civilian docs

- `docs/for-civilians.md`
- `docs/how-worldwatch-works.md`
- `docs/why-the-readiness-gap-matters.md`

## Civilian acceptable use

You may not use WorldWatch to support military targeting, kinetic operations, covert surveillance, sanctions evasion, unlawful export activity, or access by prohibited persons or entities. WorldWatch is intended for lawful public-source monitoring and analysis only.
