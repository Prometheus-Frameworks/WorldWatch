# WorldWatch Railway Deployment Guide

This is the minimum deployment wiring for a serious internal Railway launch of canonical WorldWatch surfaces (analyst dashboard, ops console, API, recurring scheduler).

## 1) Services to create

Create **three Railway services** in the same project:

1. **Postgres** (Railway Postgres plugin/service)
2. **worldwatch-web** (Node app)
3. **worldwatch-scheduler** (Node app)

Use the same repo for web and scheduler. Keep roles split:

- **web service**: analyst + ops UI and API only (`npm run deploy:web`)
- **scheduler service**: recurring cycle execution only (`npm run deploy:scheduler`)

No queue/external orchestration is required for this split.

## 2) Runtime contract

### Required variables (both web + scheduler)

- `DATABASE_URL` (must point to Railway Postgres connection string)
- `DEPLOYMENT_POSTURE` (`internal`, `invite_only`, or `public_read_only`)
- `ACLED_URL`
- `GDELT_URL`
- `IMF_PORTWATCH_URL`
- `EIA_URL`
- `UNHCR_URL`
- `NASA_FIRMS_URL`

### Required variable (web service)

- `PORT` (Railway injects this; app listens on `process.env.PORT`)

### Optional variables

- `CYCLE_INTERVAL_MINUTES` (scheduler interval, default `15`)
- `DEPLOYMENT_BANNER_TEXT` (posture banner override)
- `DEPLOYMENT_SUBTITLE_TEXT` (posture subtitle override)

## 3) Start commands

Configure service start commands explicitly:

- **worldwatch-web**: `npm run deploy:web`
- **worldwatch-scheduler**: `npm run deploy:scheduler`

Build command (both):

- `npm ci`

## 4) Healthcheck

Use a dedicated healthcheck path on the web service:

- **Recommended Railway healthcheck path**: `/healthz`

Behavior:

- returns `200` with `{ "status": "ok" }` when process is live and DB probe succeeds
- returns `503` with `{ "status": "unavailable" }` if DB readiness probe fails

This endpoint is deterministic and intended for deployment/runtime readiness checks.

## 5) Postgres wiring

1. Provision Railway Postgres.
2. Expose/inject `DATABASE_URL` to both app services.
3. Run DB bootstrap against the same URL:
   - `npm run db:migrate`
   - `npm run db:seed`

`DATABASE_URL` is the canonical DB bootstrap input and should be treated as mandatory.

## 6) Recommended first-launch posture

Set `DEPLOYMENT_POSTURE=internal` for first Railway launch.

Then verify:

- analyst dashboard (`/`)
- ops console (`/ops`)
- policy page (`/about`)
- scheduler logs show recurring cycle starts/completions

## 7) Verification checklist after boot

1. `GET /healthz` returns `200`.
2. `GET /api/ops/health` returns structured ops health payload.
3. `GET /api/analyst/dashboard` returns bootstrap payload.
4. Scheduler logs at least one complete cycle without overlap errors.

## 8) Known limitations

- Healthcheck indicates process + DB readiness; it is not a full functional SLA probe.
- Early deployments may show sparse compare/history until more snapshots accumulate.
- This guide does not change deterministic scoring math or explainability behavior.
