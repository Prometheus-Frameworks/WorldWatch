# WorldWatch Railway Deployment Guide

Use this for the **first internal Railway launch** of canonical WorldWatch surfaces. This is intentionally minimal: Postgres + one web service + one scheduler service.

## 1) Create the Railway services
Create **three Railway services** in one Railway project:

1. **Postgres**
2. **worldwatch-web**
3. **worldwatch-scheduler**

Keep the roles strict:

- **worldwatch-web** = analyst dashboard + ops console + API only
- **worldwatch-scheduler** = recurring cycle execution only

Do **not** use the web service as the recurring scheduler.

## 2) Explicit start commands
Set the Railway start command for each app service explicitly:

- **worldwatch-web**: `npm run deploy:web`
- **worldwatch-scheduler**: `npm run deploy:scheduler`

Build command for both:

- `npm ci`

Local aliases mirror the same split:

- `npm run web:start`
- `npm run scheduler:start`

## 3) Environment variables
### Required for both services
- `DATABASE_URL` — required; must point at the Railway Postgres instance
- `DEPLOYMENT_POSTURE` — required; set to `internal` for first launch
- `ACLED_URL` — required
- `GDELT_URL` — required
- `IMF_PORTWATCH_URL` — required
- `EIA_URL` — required
- `UNHCR_URL` — required
- `NASA_FIRMS_URL` — required

### Required for the web service
- `PORT` — required by Railway runtime; Railway injects this and the web service listens on `process.env.PORT`

### Optional
- `CYCLE_INTERVAL_MINUTES` — scheduler only; defaults to `15`
- `DEPLOYMENT_BANNER_TEXT`
- `DEPLOYMENT_SUBTITLE_TEXT`

## 4) Boot behavior and failure modes
- Services validate required env vars before boot.
- Missing `DATABASE_URL` fails immediately with a readable role-specific error.
- Postgres connectivity is probed before either service is considered started.
- The web service does not begin listening until the DB probe succeeds.
- The scheduler does not begin recurring work until the DB probe succeeds.
- Startup summary logs include service role, deployment posture, port or interval (when relevant), and whether DB config is present. No secrets are logged.

## 5) Web readiness / healthcheck
Configure Railway web healthcheck path to:

- `/healthz`

Deterministic behavior:

- `200` → web process is up **and** a DB readiness probe succeeds
- `503` → web process is up but DB readiness probe failed

Example payloads:

- `200`: `{ "status": "ok", "service": "web", "readiness": "ready" }`
- `503`: `{ "status": "unavailable", "service": "web", "readiness": "database_unavailable" }`

This is a readiness probe, not a full analyst workflow SLA probe.

## 6) First-launch posture
For the first Railway launch, set:

- `DEPLOYMENT_POSTURE=internal`

Do not widen posture until the internal verification flow below passes.

## 7) First-launch verification flow
1. **Create Postgres** in Railway.
2. **Wire `DATABASE_URL`** from Railway Postgres into both `worldwatch-web` and `worldwatch-scheduler`.
3. **Set all required source endpoint variables** on both services.
4. **Set `DEPLOYMENT_POSTURE=internal`** on both services.
5. **Run migrations** against the same `DATABASE_URL`:
   - `npm run db:migrate`
6. **Run seeds** against the same `DATABASE_URL`:
   - `npm run db:seed`
7. **Launch web** with `npm run deploy:web`.
8. **Launch scheduler** with `npm run deploy:scheduler`.
9. **Verify web readiness**:
   - `GET /healthz` returns `200`
10. **Verify ops API**:
   - `GET /api/ops/health`
11. **Verify analyst bootstrap**:
   - `GET /api/analyst/dashboard`
12. **Verify scheduler behavior**:
   - confirm logs show at least one completed cycle without overlap errors

## 8) Operator notes
- `PORT` handling is only relevant to the web service.
- `CYCLE_INTERVAL_MINUTES` only affects the scheduler service.
- Manual cycle trigger lives on the web/ops surface, but recurring execution belongs to the scheduler service.
- Sparse compare/history output is normal on a fresh deployment until snapshots accumulate.
