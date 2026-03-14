# WorldWatch

WorldWatch now includes runtime bootstrap scripts for operations workflows and an internal ops API surface.

## Runtime scripts

All scripts use environment variables and run directly with TypeScript strip-types mode.

- `npm run db:migrate` — applies `db/schema.sql` to the configured Postgres database.
- `npm run db:seed` — applies all SQL files in `db/seeds/` in lexical order.
- `npm run cycle:run` — executes one full WorldWatch ingestion + scoring cycle.
- `npm run api:start` — starts the API server.

### Required environment variables

- `DATABASE_URL`
- `ACLED_URL`
- `GDELT_URL`
- `IMF_PORTWATCH_URL`
- `EIA_URL`

### Optional environment variables

- `PORT` (default `8787`)

## Internal ops API

In addition to region/feed endpoints, the API now exposes internal operational monitoring endpoints backed by `job_runs`:

- `GET /api/ops/health`
- `GET /api/ops/cycle/latest`
- `GET /api/ops/source-freshness`
- `GET /api/ops/failures?limit=20`

These endpoints support run health monitoring, latest cycle status, source freshness checks, and recent failures for internal operations.
