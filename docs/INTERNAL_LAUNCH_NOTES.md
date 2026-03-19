# INTERNAL_LAUNCH_NOTES

Dead-simple first Railway boot checklist.

## Before launch
- Create Railway Postgres.
- Create `worldwatch-web` and `worldwatch-scheduler` services.
- Set both app services to the same repo.
- Set `DEPLOYMENT_POSTURE=internal` on both services.
- Wire the same `DATABASE_URL` into both services.
- Set all six canonical source endpoint vars on both services.

## Bootstrap the database
1. `npm run db:migrate`
2. `npm run db:seed`

## Start services
1. Web: `npm run deploy:web`
2. Scheduler: `npm run deploy:scheduler`

## Verify immediately
1. `GET /healthz` → expect `200`
2. `GET /api/ops/health`
3. `GET /api/analyst/dashboard`
4. Check scheduler logs for one successful completed cycle

## If boot fails
- Missing `DATABASE_URL` now fails fast with an explicit startup error.
- Failed DB connectivity blocks startup and keeps web from reporting ready.
- If `/healthz` returns `503`, fix DB connectivity before debugging analyst or ops surfaces.
