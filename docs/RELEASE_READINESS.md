# WorldWatch Internal Release Readiness Checklist

Use this checklist before broadening usage beyond the first internal Railway deployment.

## 1) Analyst workflow sanity
- [ ] Region table, feed, and internal map load with deterministic ordering.
- [ ] Focus Mode remains the default first-scan path.
- [ ] Pinned sections persist and reset cleanly.
- [ ] Snapshot compare remains readable and deterministic.
- [ ] Source-quality/trust cue appears on dashboard and detail surfaces.

## 2) Ops sanity
- [ ] Posture banner is visible in Ops.
- [ ] Manual cycle trigger behavior matches posture rules.
- [ ] Latest cycle, cycle history, failures, freshness, and degradation views all render.
- [ ] Source degradation indicators clearly separate source trouble from region-risk movement.

## 3) Posture + policy visibility
- [ ] Analyst surface shows posture banner and About/Usage/Terms access.
- [ ] Ops surface shows posture banner and policy footer.
- [ ] `/about` is reachable and preserves canonical civilian/public-source usage language.
- [ ] No regression to `public_read_only` manual-trigger blocking behavior.

## 4) Railway launch verification
- [ ] Railway Postgres exists.
- [ ] `DATABASE_URL` is wired to both web and scheduler services.
- [ ] Required source endpoint vars are set on both services.
- [ ] `DEPLOYMENT_POSTURE=internal` is set for first launch.
- [ ] `npm run db:migrate` completed successfully.
- [ ] `npm run db:seed` completed successfully.
- [ ] Web launched with `npm run deploy:web`.
- [ ] Scheduler launched with `npm run deploy:scheduler`.
- [ ] `GET /healthz` returns `200`.
- [ ] `GET /api/ops/health` returns the structured ops health payload.
- [ ] `GET /api/analyst/dashboard` returns the analyst bootstrap payload.
- [ ] Scheduler completed at least one clean cycle without overlap errors.

## 5) Known limitations
- `/healthz` is a deterministic DB-backed readiness check, not a full functional SLA probe.
- Source-quality cues are deterministic interpretation aids; they do not replace analyst judgment.
- Snapshot compare and history can be sparse on a fresh deployment.
- Internal map remains supporting context, not the primary workflow.
- This checklist does not change score math.
